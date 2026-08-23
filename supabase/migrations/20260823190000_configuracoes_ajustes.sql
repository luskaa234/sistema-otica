-- Ajustes ao schema para o Módulo 8 (Configurações).

alter table public.configuracoes_loja
  add column email text,
  add column parcelamento_maximo integer not null default 1,
  add column estoque_minimo_padrao integer not null default 3,
  add column comissao_padrao jsonb not null default '{"tipo": "percentual_fixo", "percentual_fixo": 5}';

-- ========== STORAGE — logo da loja ==========
insert into storage.buckets (id, name, public)
values ('loja', 'loja', true)
on conflict (id) do nothing;

create policy "admin_upload_logo_loja" on storage.objects
  for insert with check (bucket_id = 'loja' and public.is_admin());

create policy "admin_atualiza_logo_loja" on storage.objects
  for update using (bucket_id = 'loja' and public.is_admin());

create policy "admin_deleta_logo_loja" on storage.objects
  for delete using (bucket_id = 'loja' and public.is_admin());
