import { useSupabaseQuery } from './useSupabaseQuery'

/**
 * Dados da loja (nome, logo, endereço...) usados no cabeçalho dos PDFs
 * de orçamento/recibo e em outras telas que precisam da identidade da loja.
 */
export function useLoja() {
  const { dados, carregando } = useSupabaseQuery(
    (supabase) => supabase.from('configuracoes_loja').select('*').limit(1).maybeSingle(),
    []
  )
  return { loja: dados, carregandoLoja: carregando }
}
