-- Ajustes ao schema para o Módulo 1 (Clientes & Receitas):
-- cliente ativo/inativo, foto anexada à receita, buckets de storage.

alter table public.clientes
  add column ativo boolean not null default true;

alter table public.receitas
  add column foto_url text;

-- Receitas nunca têm seus dados ópticos sobrescritos, mas o flag `ativa`
-- precisa poder ser desligado quando uma nova receita é cadastrada.
create policy "admin_vendedor_atualizam_flag_ativa_receita" on public.receitas
  for update using (public.current_perfil() in ('admin', 'vendedor'))
  with check (public.current_perfil() in ('admin', 'vendedor'));

-- ========== STORAGE ==========
insert into storage.buckets (id, name, public)
values ('clientes', 'clientes', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('receitas', 'receitas', true)
on conflict (id) do nothing;

create policy "admin_vendedor_upload_fotos_clientes" on storage.objects
  for insert with check (bucket_id = 'clientes' and public.current_perfil() in ('admin', 'vendedor'));

create policy "admin_vendedor_atualiza_fotos_clientes" on storage.objects
  for update using (bucket_id = 'clientes' and public.current_perfil() in ('admin', 'vendedor'));

create policy "admin_vendedor_deleta_fotos_clientes" on storage.objects
  for delete using (bucket_id = 'clientes' and public.current_perfil() in ('admin', 'vendedor'));

create policy "admin_vendedor_upload_fotos_receitas" on storage.objects
  for insert with check (bucket_id = 'receitas' and public.current_perfil() in ('admin', 'vendedor'));

create policy "admin_vendedor_atualiza_fotos_receitas" on storage.objects
  for update using (bucket_id = 'receitas' and public.current_perfil() in ('admin', 'vendedor'));

create policy "admin_vendedor_deleta_fotos_receitas" on storage.objects
  for delete using (bucket_id = 'receitas' and public.current_perfil() in ('admin', 'vendedor'));
