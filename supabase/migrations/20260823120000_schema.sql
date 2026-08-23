-- Ótica Monte Sinai — schema inicial
-- Convenção: chaves primárias uuid, timestamps em timestamptz, tudo em public.

create extension if not exists "pgcrypto";

-- ========== FUNCIONÁRIOS ==========
create table public.funcionarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  nome text not null,
  email text not null unique,
  perfil text not null check (perfil in ('admin', 'vendedor', 'financeiro')),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ========== CLIENTES ==========
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  nome text not null,
  cpf text not null unique,
  telefone text,
  email text,
  cep text,
  endereco text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  uf text,
  data_nascimento date,
  foto_url text,
  observacoes text,
  created_at timestamptz not null default now()
);

create index clientes_cpf_idx on public.clientes (cpf);
create index clientes_nome_idx on public.clientes (nome);

-- ========== RECEITAS (versionada: nunca update, sempre insert) ==========
create table public.receitas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  esferico_od numeric(4, 2),
  cilindrico_od numeric(4, 2),
  eixo_od smallint,
  esferico_oe numeric(4, 2),
  cilindrico_oe numeric(4, 2),
  eixo_oe smallint,
  adicao numeric(4, 2),
  dnp numeric(4, 1),
  altura numeric(4, 1),
  tipo_lente text,
  medico text,
  data_consulta date,
  ativa boolean not null default true,
  criado_por uuid references public.funcionarios (id),
  created_at timestamptz not null default now()
);

create index receitas_cliente_idx on public.receitas (cliente_id);
create index receitas_cliente_ativa_idx on public.receitas (cliente_id, ativa);

-- ========== FORNECEDORES ==========
create table public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  telefone text,
  email text,
  endereco text,
  created_at timestamptz not null default now()
);

-- ========== PRODUTOS (armações, lentes, acessórios) ==========
create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('armacao', 'lente', 'acessorio')),
  sku text unique,
  marca text,
  modelo text,
  cor text,
  custo numeric(10, 2) not null default 0,
  preco numeric(10, 2) not null default 0,
  estoque_atual integer,
  estoque_minimo integer default 3,
  fornecedor_id uuid references public.fornecedores (id),
  prazo_dias integer,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create index produtos_tipo_idx on public.produtos (tipo);

-- ========== ORDENS DE SERVIÇO ==========
create table public.ordens_servico (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id),
  receita_id uuid references public.receitas (id),
  vendedor_id uuid references public.funcionarios (id),
  status text not null default 'orcamento'
    check (status in ('orcamento', 'aprovado', 'em_producao', 'pronto', 'entregue', 'cancelado')),
  valor_total numeric(10, 2) not null default 0,
  desconto numeric(10, 2) not null default 0,
  prazo_entrega date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index os_cliente_idx on public.ordens_servico (cliente_id);
create index os_status_idx on public.ordens_servico (status);
create index os_vendedor_idx on public.ordens_servico (vendedor_id);

-- Histórico de mudança de status (timeline da OS)
create table public.os_status_historico (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico (id) on delete cascade,
  status_anterior text,
  status_novo text not null,
  funcionario_id uuid references public.funcionarios (id),
  created_at timestamptz not null default now()
);

create index os_status_historico_os_idx on public.os_status_historico (os_id);

-- ========== ITENS DA OS ==========
create table public.os_itens (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico (id) on delete cascade,
  produto_id uuid not null references public.produtos (id),
  quantidade integer not null default 1,
  valor_unitario numeric(10, 2) not null
);

create index os_itens_os_idx on public.os_itens (os_id);

-- ========== PAGAMENTOS (atualizado só via webhook / service role) ==========
create table public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico (id),
  asaas_payment_id text unique,
  valor numeric(10, 2) not null,
  forma_pagamento text,
  status text not null default 'PENDING',
  data_pagamento timestamptz,
  created_at timestamptz not null default now()
);

create index pagamentos_os_idx on public.pagamentos (os_id);
create index pagamentos_status_idx on public.pagamentos (status);

-- ========== CONTAS A PAGAR ==========
create table public.contas_pagar (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  categoria text,
  fornecedor_id uuid references public.fornecedores (id),
  valor numeric(10, 2) not null,
  data_vencimento date not null,
  data_pagamento date,
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'atrasado')),
  created_at timestamptz not null default now()
);

create index contas_pagar_vencimento_idx on public.contas_pagar (data_vencimento);

-- ========== ESTOQUE - MOVIMENTOS ==========
create table public.estoque_movimentos (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos (id),
  tipo text not null check (tipo in ('entrada', 'saida')),
  quantidade integer not null,
  motivo text,
  funcionario_id uuid references public.funcionarios (id),
  data timestamptz not null default now()
);

create index estoque_movimentos_produto_idx on public.estoque_movimentos (produto_id);

-- ========== COMISSÕES ==========
create table public.comissoes (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references public.funcionarios (id),
  os_id uuid not null references public.ordens_servico (id),
  percentual_ou_valor numeric(10, 2) not null,
  tipo text not null default 'percentual' check (tipo in ('percentual', 'valor_fixo')),
  valor_calculado numeric(10, 2) not null default 0,
  status text not null default 'pendente' check (status in ('pendente', 'pago')),
  created_at timestamptz not null default now()
);

create index comissoes_funcionario_idx on public.comissoes (funcionario_id);

-- ========== CAMPANHAS DE MARKETING ==========
create table public.campanhas_marketing (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  canal text not null check (canal in ('whatsapp', 'email')),
  mensagem text not null,
  segmento text,
  data_envio timestamptz,
  status text not null default 'rascunho' check (status in ('rascunho', 'agendada', 'enviada', 'erro')),
  created_at timestamptz not null default now()
);

-- ========== CONFIGURAÇÕES DA LOJA ==========
create table public.configuracoes_loja (
  id uuid primary key default gen_random_uuid(),
  nome text,
  cnpj text,
  endereco text,
  telefone text,
  logo_url text,
  formas_pagamento_aceitas text[] default '{}',
  mensagens_automaticas jsonb default '{}',
  updated_at timestamptz not null default now()
);

-- ========== LOG DE AUDITORIA ==========
create table public.logs_auditoria (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid references public.funcionarios (id),
  acao text not null,
  tabela_afetada text,
  registro_id uuid,
  detalhes jsonb,
  created_at timestamptz not null default now()
);

create index logs_auditoria_funcionario_idx on public.logs_auditoria (funcionario_id);
