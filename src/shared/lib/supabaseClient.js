import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não configuradas. Copie .env.example para .env e preencha os valores. Rodando sem conexão com o Supabase — chamadas ao banco vão falhar.'
  )
}

// ".invalid" é um TLD reservado (RFC 2606) que sempre falha a resolução de
// DNS imediatamente — ao contrário de um subdomínio real de supabase.co,
// que fica pendurado sem responder e trava a UI em "carregando" para sempre.
export const supabase = createClient(
  supabaseUrl || 'https://supabase-nao-configurado.invalid',
  supabaseAnonKey || 'placeholder-anon-key'
)
