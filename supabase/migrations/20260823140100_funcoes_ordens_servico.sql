-- Funções de suporte ao módulo de Vendas/OS.
-- Todas SECURITY INVOKER (padrão): respeitam o RLS de quem chama.

-- Listagem de OS com nome do cliente/vendedor, filtros, ordenação e paginação.
create or replace function public.listar_ordens_servico(
  p_status text default null,
  p_busca text default null,
  p_vendedor_id uuid default null,
  p_data_inicio date default null,
  p_data_fim date default null,
  p_limit int default 25,
  p_offset int default 0
)
returns table (
  id uuid,
  numero integer,
  cliente_id uuid,
  cliente_nome text,
  vendedor_id uuid,
  vendedor_nome text,
  status text,
  valor_total numeric,
  desconto numeric,
  prazo_entrega date,
  created_at timestamptz,
  total_registros bigint
)
language sql
stable
as $$
  with base as (
    select
      os.id, os.numero, os.cliente_id, c.nome as cliente_nome,
      os.vendedor_id, f.nome as vendedor_nome,
      os.status, os.valor_total, os.desconto, os.prazo_entrega, os.created_at
    from public.ordens_servico os
    join public.clientes c on c.id = os.cliente_id
    left join public.funcionarios f on f.id = os.vendedor_id
    where
      (p_status is null or p_status = 'todos' or os.status = p_status)
      and (p_vendedor_id is null or os.vendedor_id = p_vendedor_id)
      and (p_data_inicio is null or os.created_at::date >= p_data_inicio)
      and (p_data_fim is null or os.created_at::date <= p_data_fim)
      and (
        p_busca is null or p_busca = '' or
        c.nome ilike '%' || p_busca || '%' or
        os.numero::text = p_busca
      )
  )
  select *, count(*) over() as total_registros
  from base
  order by created_at desc
  limit p_limit offset p_offset;
$$;

grant execute on function public.listar_ordens_servico(text, text, uuid, date, date, int, int) to authenticated;

-- Cria a OS e seus itens numa única transação (evita OS "órfã" sem itens
-- se algo falhar no meio do caminho).
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

  return v_os_id;
end;
$$;

grant execute on function public.criar_ordem_servico(uuid, uuid, uuid, text, numeric, numeric, text, text, date, jsonb) to authenticated;

-- Avança (ou cancela) o status da OS e registra no histórico, atomicamente.
create or replace function public.avancar_status_os(
  p_os_id uuid,
  p_novo_status text,
  p_funcionario_id uuid,
  p_motivo text default null
)
returns void
language plpgsql
security invoker
as $$
declare
  v_status_atual text;
begin
  select status into v_status_atual from public.ordens_servico where id = p_os_id;

  update public.ordens_servico
  set
    status = p_novo_status,
    updated_at = now(),
    motivo_cancelamento = case when p_novo_status = 'cancelado' then p_motivo else motivo_cancelamento end
  where id = p_os_id;

  insert into public.os_status_historico (os_id, status_anterior, status_novo, funcionario_id, motivo)
  values (p_os_id, v_status_atual, p_novo_status, p_funcionario_id, p_motivo);
end;
$$;

grant execute on function public.avancar_status_os(uuid, text, uuid, text) to authenticated;
