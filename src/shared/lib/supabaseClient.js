import { createClient } from '@supabase/supabase-js'
import { criarClienteDemo } from './demo/client'

const flagDemo = import.meta.env.VITE_DEMO_MODE
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const temSupabaseReal = Boolean(supabaseUrl && supabaseAnonKey)

// Cai para o modo demo automaticamente quando não há credenciais reais
// configuradas (ex: clone novo do repositório ou deploy sem .env, já que
// o .env é local e não vai pro git) — só fica no modo "Supabase real
// quebrado" se alguém desativar o demo explicitamente (VITE_DEMO_MODE=false)
// sem configurar as credenciais.
const modoDemo = flagDemo === 'true' || (flagDemo !== 'false' && !temSupabaseReal)

if (!modoDemo && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn(
    'Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não configuradas. Copie .env.example para .env e preencha os valores. Rodando sem conexão com o Supabase — chamadas ao banco vão falhar. Para testar com dados de exemplo sem backend, defina VITE_DEMO_MODE=true.'
  )
}

if (modoDemo) {
  console.info(
    '[Modo demo] Rodando com dados de exemplo em memória — nenhuma chamada real ao Supabase é feita. Defina VITE_DEMO_MODE=false (e as credenciais reais) para usar um banco de verdade.'
  )
}

// ".invalid" é um TLD reservado (RFC 2606) que sempre falha a resolução de
// DNS imediatamente — ao contrário de um subdomínio real de supabase.co,
// que fica pendurado sem responder e trava a UI em "carregando" para sempre.
export const supabase = modoDemo
  ? criarClienteDemo()
  : createClient(
      supabaseUrl || 'https://supabase-nao-configurado.invalid',
      supabaseAnonKey || 'placeholder-anon-key'
    )
