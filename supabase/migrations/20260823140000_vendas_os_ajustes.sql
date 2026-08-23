-- Ajustes ao schema para o Módulo 2 (Vendas / OS).

-- Número sequencial legível da OS (além do uuid interno).
create sequence if not exists public.ordens_servico_numero_seq;

alter table public.ordens_servico
  add column numero integer not null default nextval('public.ordens_servico_numero_seq'),
  add column forma_pagamento text,
  add column motivo_desconto text,
  add column motivo_cancelamento text;

alter sequence public.ordens_servico_numero_seq owned by public.ordens_servico.numero;
create unique index ordens_servico_numero_idx on public.ordens_servico (numero);

-- Motivo da mudança de status (usado principalmente no cancelamento).
alter table public.os_status_historico
  add column motivo text;

-- Limite de desconto (%) acima do qual um motivo é obrigatório. Linha única
-- de configuração da loja — Módulo 8 vai expor isso numa tela de verdade.
alter table public.configuracoes_loja
  add column desconto_limite_percentual numeric not null default 10;

insert into public.configuracoes_loja (nome)
select 'Ótica Monte Sinai'
where not exists (select 1 from public.configuracoes_loja);

-- A lista de OS precisa mostrar o nome do vendedor responsável para
-- qualquer perfil de funcionário (não só admin) — a política original
-- da Fase 1 restringia demais. Nome/e-mail de colegas não é dado sensível
-- num sistema interno de uma única loja.
drop policy if exists "funcionario_le_proprio_perfil" on public.funcionarios;

create policy "funcionarios_leem_uns_aos_outros" on public.funcionarios
  for select using (public.is_funcionario());
