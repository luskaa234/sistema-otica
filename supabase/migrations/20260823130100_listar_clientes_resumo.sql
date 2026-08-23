-- Função de listagem de clientes com estatísticas agregadas, busca, filtros,
-- ordenação e paginação no servidor. SECURITY INVOKER (padrão): roda com o
-- RLS do usuário que chama, então respeita as políticas de clientes/ordens_servico/receitas.
create or replace function public.listar_clientes_resumo(
  p_busca text default null,
  p_ativo boolean default null,
  p_tem_receita boolean default null,
  p_ordenar text default 'nome',
  p_limit int default 25,
  p_offset int default 0
)
returns table (
  id uuid,
  nome text,
  cpf text,
  telefone text,
  email text,
  foto_url text,
  ativo boolean,
  created_at timestamptz,
  total_gasto numeric,
  ultima_compra timestamptz,
  tem_receita_ativa boolean,
  total_registros bigint
)
language sql
stable
as $$
  with base as (
    select
      c.id,
      c.nome,
      c.cpf,
      c.telefone,
      c.email,
      c.foto_url,
      c.ativo,
      c.created_at,
      coalesce(sum(os.valor_total - os.desconto) filter (where os.status <> 'cancelado'), 0) as total_gasto,
      max(os.created_at) filter (where os.status <> 'cancelado') as ultima_compra,
      exists (
        select 1 from public.receitas r where r.cliente_id = c.id and r.ativa
      ) as tem_receita_ativa
    from public.clientes c
    left join public.ordens_servico os on os.cliente_id = c.id
    where
      (p_busca is null or p_busca = '' or
        c.nome ilike '%' || p_busca || '%' or
        c.cpf ilike '%' || p_busca || '%' or
        c.telefone ilike '%' || p_busca || '%')
      and (p_ativo is null or c.ativo = p_ativo)
    group by c.id
  ),
  filtrada as (
    select * from base
    where p_tem_receita is null or tem_receita_ativa = p_tem_receita
  )
  select *, count(*) over() as total_registros
  from filtrada
  order by
    case when p_ordenar = 'ultima_compra' then ultima_compra end desc nulls last,
    case when p_ordenar = 'nome' or p_ordenar is null then nome end asc
  limit p_limit offset p_offset;
$$;

grant execute on function public.listar_clientes_resumo(text, boolean, boolean, text, int, int) to authenticated;
