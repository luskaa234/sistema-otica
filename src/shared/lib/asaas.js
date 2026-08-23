import { supabase } from './supabaseClient'

/**
 * Todas as integrações com Asaas passam por Edge Functions do Supabase.
 * A API key da Asaas nunca é exposta no frontend.
 */

export async function criarCobranca(osId) {
  const { data, error } = await supabase.functions.invoke('asaas-criar-cobranca', {
    body: { os_id: osId },
  })
  if (error) throw error
  return data
}
