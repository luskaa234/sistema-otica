-- Ajustes ao schema para o Módulo 4 (Financeiro).

-- Régua de cobrança: quando um lembrete de pagamento foi enviado/marcado.
-- invoice_url guarda o link do comprovante/fatura retornado pela Asaas.
alter table public.pagamentos
  add column lembrete_enviado_em timestamptz,
  add column invoice_url text;

-- ========== REGRAS DE COMISSÃO ==========
create table public.regras_comissao (
  funcionario_id uuid primary key references public.funcionarios (id) on delete cascade,
  tipo text not null default 'percentual_fixo'
    check (tipo in ('percentual_fixo', 'percentual_categoria', 'valor_fixo')),
  percentual_fixo numeric,
  regras_categoria jsonb not null default '{}',
  valor_fixo numeric,
  updated_at timestamptz not null default now()
);

alter table public.regras_comissao enable row level security;

create policy "admin_financeiro_gerenciam_regras_comissao" on public.regras_comissao
  for all using (public.current_perfil() in ('admin', 'financeiro'))
  with check (public.current_perfil() in ('admin', 'financeiro'));

create policy "vendedor_le_propria_regra_comissao" on public.regras_comissao
  for select using (funcionario_id = public.current_funcionario_id());

-- ========== FECHAMENTO DE COMISSÕES ==========
-- Calcula e grava as comissões do período para OS ainda sem comissão
-- registrada (idempotente). Retorna quantas comissões foram geradas.
create or replace function public.fechar_periodo_comissoes(
  p_data_inicio date,
  p_data_fim date
)
returns integer
language plpgsql
security invoker
as $$
declare
  v_os record;
  v_regra record;
  v_valor numeric;
  v_contador integer := 0;
begin
  for v_os in
    select os.id, os.vendedor_id, os.valor_total, os.desconto
    from public.ordens_servico os
    where os.status not in ('orcamento', 'cancelado')
      and os.created_at::date between p_data_inicio and p_data_fim
      and os.vendedor_id is not null
      and not exists (select 1 from public.comissoes c where c.os_id = os.id)
  loop
    select * into v_regra from public.regras_comissao where funcionario_id = v_os.vendedor_id;

    if not found then
      continue;
    end if;

    if v_regra.tipo = 'valor_fixo' then
      v_valor := coalesce(v_regra.valor_fixo, 0);
    elsif v_regra.tipo = 'percentual_categoria' then
      select coalesce(sum(
        oi.valor_unitario * oi.quantidade * coalesce((v_regra.regras_categoria ->> p.tipo)::numeric, 0) / 100
      ), 0)
      into v_valor
      from public.os_itens oi
      join public.produtos p on p.id = oi.produto_id
      where oi.os_id = v_os.id;
    else
      v_valor := (v_os.valor_total - coalesce(v_os.desconto, 0)) * coalesce(v_regra.percentual_fixo, 0) / 100;
    end if;

    insert into public.comissoes (funcionario_id, os_id, percentual_ou_valor, tipo, valor_calculado, status)
    values (
      v_os.vendedor_id,
      v_os.id,
      coalesce(v_regra.percentual_fixo, v_regra.valor_fixo, 0),
      case when v_regra.tipo = 'valor_fixo' then 'valor_fixo' else 'percentual' end,
      v_valor,
      'pendente'
    );

    v_contador := v_contador + 1;
  end loop;

  return v_contador;
end;
$$;

grant execute on function public.fechar_periodo_comissoes(date, date) to authenticated;

-- ========== RELATÓRIOS ==========
create or replace function public.produtos_mais_vendidos(
  p_data_inicio date,
  p_data_fim date,
  p_limit int default 5
)
returns table (
  produto_id uuid,
  marca text,
  modelo text,
  tipo text,
  quantidade_vendida bigint,
  valor_total numeric
)
language sql
stable
as $$
  select
    p.id, p.marca, p.modelo, p.tipo,
    sum(oi.quantidade) as quantidade_vendida,
    sum(oi.quantidade * oi.valor_unitario) as valor_total
  from public.os_itens oi
  join public.produtos p on p.id = oi.produto_id
  join public.ordens_servico os on os.id = oi.os_id
  where os.status <> 'cancelado'
    and os.created_at::date between p_data_inicio and p_data_fim
  group by p.id, p.marca, p.modelo, p.tipo
  order by quantidade_vendida desc
  limit p_limit;
$$;

grant execute on function public.produtos_mais_vendidos(date, date, int) to authenticated;

create or replace function public.vendas_por_vendedor(
  p_data_inicio date,
  p_data_fim date
)
returns table (
  funcionario_id uuid,
  nome text,
  quantidade_vendas bigint,
  valor_total numeric
)
language sql
stable
as $$
  select
    f.id, f.nome,
    count(os.id) as quantidade_vendas,
    coalesce(sum(os.valor_total - os.desconto), 0) as valor_total
  from public.funcionarios f
  left join public.ordens_servico os
    on os.vendedor_id = f.id
    and os.status not in ('orcamento', 'cancelado')
    and os.created_at::date between p_data_inicio and p_data_fim
  where f.perfil = 'vendedor'
  group by f.id, f.nome
  order by valor_total desc;
$$;

grant execute on function public.vendas_por_vendedor(date, date) to authenticated;

create or replace function public.resumo_vendas_periodo(
  p_data_inicio date,
  p_data_fim date
)
returns table (
  total_vendido numeric,
  qtd_vendas bigint,
  ticket_medio numeric,
  qtd_orcamentos bigint,
  taxa_conversao numeric
)
language sql
stable
as $$
  with vendas as (
    select os.valor_total - os.desconto as valor
    from public.ordens_servico os
    where os.status not in ('orcamento', 'cancelado')
      and os.created_at::date between p_data_inicio and p_data_fim
  ),
  orcamentos as (
    select count(*) as qtd
    from public.ordens_servico os
    where os.created_at::date between p_data_inicio and p_data_fim
  )
  select
    coalesce(sum(v.valor), 0) as total_vendido,
    count(v.valor) as qtd_vendas,
    case when count(v.valor) > 0 then coalesce(sum(v.valor), 0) / count(v.valor) else 0 end as ticket_medio,
    (select qtd from orcamentos) as qtd_orcamentos,
    case
      when (select qtd from orcamentos) > 0
        then round(count(v.valor)::numeric / (select qtd from orcamentos) * 100, 1)
      else 0
    end as taxa_conversao
  from vendas v;
$$;

grant execute on function public.resumo_vendas_periodo(date, date) to authenticated;
