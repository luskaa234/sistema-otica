import { supabase } from './supabaseClient'

/**
 * Envia um arquivo para um bucket público e retorna a URL pública.
 * Buckets usados: 'clientes' (foto do cliente) e 'receitas' (foto da receita física).
 */
export async function enviarArquivo(bucket, pastaId, arquivo) {
  const extensao = arquivo.name.split('.').pop()
  const caminho = `${pastaId}/${crypto.randomUUID()}.${extensao}`

  const { error } = await supabase.storage.from(bucket).upload(caminho, arquivo, {
    upsert: false,
  })

  if (error) throw error

  const { data } = supabase.storage.from(bucket).getPublicUrl(caminho)
  return data.publicUrl
}
