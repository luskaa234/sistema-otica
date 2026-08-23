-- Row Level Security — Ótica Monte Sinai
-- Perfis de funcionário: admin, vendedor, financeiro. Cliente é um perfil à parte.
-- Regra geral: admin vê/edita tudo; vendedor não acessa financeiro completo;
-- financeiro não edita OS; cliente só vê os próprios dados.

alter table public.funcionarios enable row level security;
alter table public.clientes enable row level security;
alter table public.receitas enable row level security;
alter table public.fornecedores enable row level security;
alter table public.produtos enable row level security;
alter table public.ordens_servico enable row level security;
alter table public.os_status_historico enable row level security;
alter table public.os_itens enable row level security;
alter table public.pagamentos enable row level security;
alter table public.contas_pagar enable row level security;
alter table public.estoque_movimentos enable row level security;
alter table public.comissoes enable row level security;
alter table public.campanhas_marketing enable row level security;
alter table public.configuracoes_loja enable row level security;
alter table public.logs_auditoria enable row level security;

-- ========== FUNCIONARIOS ==========
create policy "admin_gerencia_funcionarios" on public.funcionarios
  for all using (public.is_admin()) with check (public.is_admin());

create policy "funcionario_le_proprio_perfil" on public.funcionarios
  for select using (user_id = auth.uid());

-- ========== CLIENTES ==========
create policy "admin_vendedor_gerenciam_clientes" on public.clientes
  for all using (public.current_perfil() in ('admin', 'vendedor'))
  with check (public.current_perfil() in ('admin', 'vendedor'));

create policy "financeiro_le_clientes" on public.clientes
  for select using (public.current_perfil() = 'financeiro');

create policy "cliente_le_proprio_cadastro" on public.clientes
  for select using (user_id = auth.uid());

create policy "cliente_atualiza_proprio_cadastro" on public.clientes
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ========== RECEITAS (nunca update/delete pela API — sempre insert) ==========
create policy "admin_vendedor_leem_inserem_receitas" on public.receitas
  for select using (public.current_perfil() in ('admin', 'vendedor'));

create policy "admin_vendedor_inserem_receitas" on public.receitas
  for insert with check (public.current_perfil() in ('admin', 'vendedor'));

create policy "cliente_le_proprias_receitas" on public.receitas
  for select using (cliente_id = public.current_cliente_id());

-- ========== FORNECEDORES ==========
create policy "admin_gerencia_fornecedores" on public.fornecedores
  for all using (public.is_admin()) with check (public.is_admin());

create policy "vendedor_financeiro_leem_fornecedores" on public.fornecedores
  for select using (public.current_perfil() in ('vendedor', 'financeiro'));

-- ========== PRODUTOS ==========
create policy "admin_vendedor_gerenciam_produtos" on public.produtos
  for all using (public.current_perfil() in ('admin', 'vendedor'))
  with check (public.current_perfil() in ('admin', 'vendedor'));

create policy "financeiro_le_produtos" on public.produtos
  for select using (public.current_perfil() = 'financeiro');

create policy "cliente_le_produtos" on public.produtos
  for select using (public.current_cliente_id() is not null);

-- ========== ORDENS DE SERVIÇO ==========
create policy "admin_vendedor_gerenciam_os" on public.ordens_servico
  for all using (public.current_perfil() in ('admin', 'vendedor'))
  with check (public.current_perfil() in ('admin', 'vendedor'));

create policy "financeiro_le_os" on public.ordens_servico
  for select using (public.current_perfil() = 'financeiro');

create policy "cliente_le_propria_os" on public.ordens_servico
  for select using (cliente_id = public.current_cliente_id());

-- ========== HISTÓRICO DE STATUS DA OS ==========
create policy "admin_vendedor_gerenciam_status_historico" on public.os_status_historico
  for all using (public.current_perfil() in ('admin', 'vendedor'))
  with check (public.current_perfil() in ('admin', 'vendedor'));

create policy "financeiro_le_status_historico" on public.os_status_historico
  for select using (public.current_perfil() = 'financeiro');

create policy "cliente_le_status_historico_propria_os" on public.os_status_historico
  for select using (
    exists (
      select 1 from public.ordens_servico os
      where os.id = os_status_historico.os_id
        and os.cliente_id = public.current_cliente_id()
    )
  );

-- ========== ITENS DA OS ==========
create policy "admin_vendedor_gerenciam_os_itens" on public.os_itens
  for all using (public.current_perfil() in ('admin', 'vendedor'))
  with check (public.current_perfil() in ('admin', 'vendedor'));

create policy "financeiro_le_os_itens" on public.os_itens
  for select using (public.current_perfil() = 'financeiro');

create policy "cliente_le_itens_propria_os" on public.os_itens
  for select using (
    exists (
      select 1 from public.ordens_servico os
      where os.id = os_itens.os_id
        and os.cliente_id = public.current_cliente_id()
    )
  );

-- ========== PAGAMENTOS ==========
-- Nunca inserido/atualizado por usuário autenticado — apenas pela Edge Function
-- (service role), que ignora RLS. Aqui só liberamos leitura.
create policy "admin_financeiro_leem_pagamentos" on public.pagamentos
  for select using (public.current_perfil() in ('admin', 'financeiro'));

create policy "vendedor_le_pagamentos_das_proprias_os" on public.pagamentos
  for select using (
    exists (
      select 1 from public.ordens_servico os
      where os.id = pagamentos.os_id
        and os.vendedor_id = public.current_funcionario_id()
    )
  );

create policy "cliente_le_proprios_pagamentos" on public.pagamentos
  for select using (
    exists (
      select 1 from public.ordens_servico os
      where os.id = pagamentos.os_id
        and os.cliente_id = public.current_cliente_id()
    )
  );

-- ========== CONTAS A PAGAR ==========
create policy "admin_financeiro_gerenciam_contas_pagar" on public.contas_pagar
  for all using (public.current_perfil() in ('admin', 'financeiro'))
  with check (public.current_perfil() in ('admin', 'financeiro'));

-- ========== ESTOQUE - MOVIMENTOS ==========
create policy "admin_vendedor_gerenciam_estoque_movimentos" on public.estoque_movimentos
  for all using (public.current_perfil() in ('admin', 'vendedor'))
  with check (public.current_perfil() in ('admin', 'vendedor'));

create policy "financeiro_le_estoque_movimentos" on public.estoque_movimentos
  for select using (public.current_perfil() = 'financeiro');

-- ========== COMISSÕES ==========
create policy "admin_financeiro_gerenciam_comissoes" on public.comissoes
  for all using (public.current_perfil() in ('admin', 'financeiro'))
  with check (public.current_perfil() in ('admin', 'financeiro'));

create policy "vendedor_le_proprias_comissoes" on public.comissoes
  for select using (funcionario_id = public.current_funcionario_id());

-- ========== CAMPANHAS DE MARKETING ==========
create policy "admin_gerencia_campanhas" on public.campanhas_marketing
  for all using (public.is_admin()) with check (public.is_admin());

-- ========== CONFIGURAÇÕES DA LOJA ==========
create policy "admin_gerencia_configuracoes" on public.configuracoes_loja
  for all using (public.is_admin()) with check (public.is_admin());

create policy "funcionarios_leem_configuracoes" on public.configuracoes_loja
  for select using (public.is_funcionario());

-- ========== LOGS DE AUDITORIA ==========
create policy "admin_le_logs_auditoria" on public.logs_auditoria
  for select using (public.is_admin());

create policy "funcionario_insere_proprio_log" on public.logs_auditoria
  for insert with check (funcionario_id = public.current_funcionario_id());
