-- Ajustes ao schema para o Módulo 3 (Estoque).

alter table public.produtos
  add column material text,
  add column foto_url text;

alter table public.fornecedores
  add column tipo text check (tipo in ('armacao', 'lente', 'ambos')),
  add column contato text,
  add column prazo_medio_dias integer;

-- ========== PEDIDOS DE LENTE ==========
-- Um pedido é criado automaticamente (via avancar_status_os) quando uma OS
-- com item de lente é aprovada.
create table public.pedidos_lente (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico (id) on delete cascade,
  produto_id uuid not null references public.produtos (id),
  fornecedor_id uuid references public.fornecedores (id),
  status text not null default 'pedido_enviado'
    check (status in ('pedido_enviado', 'em_producao', 'recebido')),
  prazo_estimado date,
  data_recebimento date,
  created_at timestamptz not null default now()
);

create index pedidos_lente_os_idx on public.pedidos_lente (os_id);
create index pedidos_lente_fornecedor_idx on public.pedidos_lente (fornecedor_id);
create index pedidos_lente_status_idx on public.pedidos_lente (status);

alter table public.pedidos_lente enable row level security;

create policy "admin_vendedor_gerenciam_pedidos_lente" on public.pedidos_lente
  for all using (public.current_perfil() in ('admin', 'vendedor'))
  with check (public.current_perfil() in ('admin', 'vendedor'));

create policy "financeiro_le_pedidos_lente" on public.pedidos_lente
  for select using (public.current_perfil() = 'financeiro');

-- Ao aprovar uma OS, gera automaticamente um pedido de lente para cada item
-- de lente (idempotente — não duplica se a OS for aprovada mais de uma vez).
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

  if p_novo_status = 'aprovado' and v_status_atual is distinct from 'aprovado' then
    insert into public.pedidos_lente (os_id, produto_id, fornecedor_id, prazo_estimado)
    select
      oi.os_id,
      oi.produto_id,
      p.fornecedor_id,
      case when p.prazo_dias is not null then current_date + p.prazo_dias else null end
    from public.os_itens oi
    join public.produtos p on p.id = oi.produto_id
    where oi.os_id = p_os_id
      and p.tipo = 'lente'
      and not exists (
        select 1 from public.pedidos_lente pl
        where pl.os_id = oi.os_id and pl.produto_id = oi.produto_id
      );
  end if;
end;
$$;

-- ========== AJUSTE ATÔMICO DE ESTOQUE ==========
create or replace function public.ajustar_estoque(
  p_produto_id uuid,
  p_tipo text,
  p_quantidade integer,
  p_motivo text,
  p_funcionario_id uuid
)
returns void
language plpgsql
security invoker
as $$
begin
  update public.produtos
  set estoque_atual = coalesce(estoque_atual, 0) + case when p_tipo = 'entrada' then p_quantidade else -p_quantidade end
  where id = p_produto_id;

  insert into public.estoque_movimentos (produto_id, tipo, quantidade, motivo, funcionario_id)
  values (p_produto_id, p_tipo, p_quantidade, p_motivo, p_funcionario_id);
end;
$$;

grant execute on function public.ajustar_estoque(uuid, text, integer, text, uuid) to authenticated;

-- ========== STORAGE — fotos de produtos (armações) ==========
insert into storage.buckets (id, name, public)
values ('produtos', 'produtos', true)
on conflict (id) do nothing;

create policy "admin_vendedor_upload_fotos_produtos" on storage.objects
  for insert with check (bucket_id = 'produtos' and public.current_perfil() in ('admin', 'vendedor'));

create policy "admin_vendedor_atualiza_fotos_produtos" on storage.objects
  for update using (bucket_id = 'produtos' and public.current_perfil() in ('admin', 'vendedor'));

create policy "admin_vendedor_deleta_fotos_produtos" on storage.objects
  for delete using (bucket_id = 'produtos' and public.current_perfil() in ('admin', 'vendedor'));
