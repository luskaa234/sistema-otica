-- Dashboard completo (Passo 7 do mega-prompt original): indicadores,
-- ação necessária, prazo real de cobrança em pagamentos, e auditoria de
-- criação de cliente/OS para o feed de atividade recente.

alter table public.pagamentos
  add column data_vencimento date;

-- ========== INDICADORES ==========
create or replace function public.dashboard_indicadores()
returns table (
  vendas_dia_valor numeric,
  vendas_dia_qtd bigint,
  vendas_mes_valor numeric,
  vendas_mes_anterior_valor numeric,
  os_orcamento bigint,
  os_em_producao bigint,
  os_pronto bigint,
  contas_receber_7dias numeric,
  contas_pagar_7dias numeric,
  estoque_baixo_qtd bigint
)
language sql
stable
as $$
  select
    coalesce((
      select sum(os.valor_total - os.desconto) from public.ordens_servico os
      where os.status not in ('orcamento', 'cancelado') and os.created_at::date = current_date
    ), 0),
    coalesce((
      select count(*) from public.ordens_servico os
      where os.status not in ('orcamento', 'cancelado') and os.created_at::date = current_date
    ), 0),
    coalesce((
      select sum(os.valor_total - os.desconto) from public.ordens_servico os
      where os.status not in ('orcamento', 'cancelado')
        and os.created_at >= date_trunc('month', current_date)
    ), 0),
    coalesce((
      select sum(os.valor_total - os.desconto) from public.ordens_servico os
      where os.status not in ('orcamento', 'cancelado')
        and os.created_at >= date_trunc('month', current_date) - interval '1 month'
        and os.created_at < date_trunc('month', current_date)
    ), 0),
    (select count(*) from public.ordens_servico where status = 'orcamento'),
    (select count(*) from public.ordens_servico where status = 'em_producao'),
    (select count(*) from public.ordens_servico where status = 'pronto'),
    coalesce((
      select sum(p.valor) from public.pagamentos p
      where p.status in ('PENDING', 'OVERDUE')
        and p.data_vencimento is not null
        and p.data_vencimento <= current_date + 7
    ), 0),
    coalesce((
      select sum(cp.valor) from public.contas_pagar cp
      where cp.status = 'pendente' and cp.data_vencimento <= current_date + 7
    ), 0),
    (
      select count(*) from public.produtos p
      where p.ativo and p.tipo in ('armacao', 'acessorio')
        and coalesce(p.estoque_atual, 0) <= coalesce(p.estoque_minimo, 3)
    );
$$;

grant execute on function public.dashboard_indicadores() to authenticated;

-- ========== AÇÃO NECESSÁRIA ==========
create or replace function public.dashboard_acao_necessaria()
returns table (tipo text, titulo text, subtitulo text, referencia_id uuid, data date)
language sql
stable
as $$
  select
    'os_atrasada', 'OS #' || os.numero || ' atrasada', c.nome, os.id, os.prazo_entrega
  from public.ordens_servico os
  join public.clientes c on c.id = os.cliente_id
  where os.status not in ('entregue', 'cancelado')
    and os.prazo_entrega is not null
    and os.prazo_entrega <= current_date

  union all

  select
    'pagamento_vencido', 'Pagamento vencido — OS #' || os.numero, c.nome, p.id, p.data_vencimento
  from public.pagamentos p
  join public.ordens_servico os on os.id = p.os_id
  join public.clientes c on c.id = os.cliente_id
  where p.status = 'OVERDUE' and p.lembrete_enviado_em is null

  union all

  select
    'lente_atrasada', 'Lente atrasada — OS #' || os.numero, pr.marca || ' ' || pr.modelo, pl.id, pl.prazo_estimado
  from public.pedidos_lente pl
  join public.ordens_servico os on os.id = pl.os_id
  join public.produtos pr on pr.id = pl.produto_id
  where pl.status <> 'recebido'
    and pl.prazo_estimado is not null
    and pl.prazo_estimado < current_date

  union all

  select
    'estoque_zerado', pr.marca || ' ' || pr.modelo || ' zerado', pr.sku, pr.id, null::date
  from public.produtos pr
  where pr.ativo and pr.tipo in ('armacao', 'acessorio') and coalesce(pr.estoque_atual, 0) = 0

  order by data nulls last;
$$;

grant execute on function public.dashboard_acao_necessaria() to authenticated;

-- ========== AUDITORIA: criar cliente / criar OS entram no feed ==========
create or replace function public.criar_ordem_servico(
  p_cliente_id uuid,
  p_receita_id uuid,
  p_vendedor_id uuid,
  p_status text,
  p_valor_total numeric,
  p_desconto numeric,
  p_motivo_desconto text,
  p_forma_pagamento text,
  p_prazo_entrega date,
  p_itens jsonb
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_os_id uuid;
  v_item jsonb;
begin
  insert into public.ordens_servico (
    cliente_id, receita_id, vendedor_id, status, valor_total, desconto,
    motivo_desconto, forma_pagamento, prazo_entrega
  ) values (
    p_cliente_id, p_receita_id, p_vendedor_id, p_status, p_valor_total, p_desconto,
    p_motivo_desconto, p_forma_pagamento, p_prazo_entrega
  ) returning id into v_os_id;

  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    insert into public.os_itens (os_id, produto_id, quantidade, valor_unitario)
    values (
      v_os_id,
      (v_item ->> 'produto_id')::uuid,
      (v_item ->> 'quantidade')::integer,
      (v_item ->> 'valor_unitario')::numeric
    );
  end loop;

  insert into public.os_status_historico (os_id, status_anterior, status_novo, funcionario_id)
  values (v_os_id, null, p_status, p_vendedor_id);

  if p_vendedor_id is not null then
    insert into public.logs_auditoria (funcionario_id, acao, tabela_afetada, registro_id, detalhes)
    values (p_vendedor_id, 'criar_os', 'ordens_servico', v_os_id, jsonb_build_object('status', p_status));
  end if;

  return v_os_id;
end;
$$;
