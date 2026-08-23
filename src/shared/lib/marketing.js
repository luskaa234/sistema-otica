import { supabase } from './supabaseClient'

export async function enviarCampanha(campanhaId) {
  const { data, error } = await supabase.functions.invoke('enviar-campanha', {
    body: { campanha_id: campanhaId },
  })
  if (error) throw error
  return data
}
