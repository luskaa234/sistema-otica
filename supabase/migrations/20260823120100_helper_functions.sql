-- Funções auxiliares usadas pelas políticas de RLS.
-- security definer + search_path fixo para evitar hijacking de schema.

create or replace function public.current_funcionario_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from public.funcionarios where user_id = auth.uid();
$$;

create or replace function public.current_perfil()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select perfil from public.funcionarios where user_id = auth.uid();
$$;

create or replace function public.current_cliente_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from public.clientes where user_id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_perfil() = 'admin';
$$;

create or replace function public.is_funcionario()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_perfil() is not null;
$$;
