-- Ajustes ao schema para o Módulo 5 (Marketing).

alter table public.campanhas_marketing
  add column inatividade_meses integer,
  add column clientes_selecionados uuid[],
  add column destinatarios_total integer,
  add column destinatarios_sucesso integer,
  add column destinatarios_falha integer,
  add column taxa_abertura numeric;

-- Calcula os destinatários reais de um segmento (usado tanto na prévia do
-- formulário quanto pela Edge Function no disparo).
create or replace function public.calcular_destinatarios_campanha(
  p_segmento text,
  p_inatividade_meses int default null,
  p_clientes_selecionados uuid[] default null
)
returns table (cliente_id uuid, nome text, telefone text, email text, ultima_compra date)
language sql
stable
as $$
  with ultima_compra_cliente as (
    select cliente_id, max(created_at)::date as ultima_compra
    from public.ordens_servico
    where status <> 'cancelado'
    group by cliente_id
  ),
  ultima_receita_cliente as (
    select cliente_id, max(created_at)::date as ultima_receita
    from public.receitas
    group by cliente_id
  )
  select c.id, c.nome, c.telefone, c.email, ucc.ultima_compra
  from public.clientes c
  left join ultima_compra_cliente ucc on ucc.cliente_id = c.id
  left join ultima_receita_cliente urc on urc.cliente_id = c.id
  where c.ativo
    and (
      p_segmento = 'todos'
      or (p_segmento = 'manual' and c.id = any(p_clientes_selecionados))
      or (p_segmento = 'inativos' and (
            ucc.ultima_compra is null
            or ucc.ultima_compra < (current_date - (coalesce(p_inatividade_meses, 6) * interval '1 month'))
          ))
      or (p_segmento = 'receita_vencida' and (
            urc.ultima_receita is null
            or urc.ultima_receita < (current_date - interval '1 year')
          ))
    );
$$;

grant execute on function public.calcular_destinatarios_campanha(text, int, uuid[]) to authenticated;
