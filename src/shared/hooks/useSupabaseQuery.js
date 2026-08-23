import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * Hook genérico de leitura para o Supabase.
 *
 * `queryFn` recebe o client do supabase e deve retornar a Promise
 * de uma query (ex: `(supabase) => supabase.from('clientes').select('*')`).
 *
 * Uso:
 *   const { dados, carregando, erro, refetch } = useSupabaseQuery(
 *     (supabase) => supabase.from('clientes').select('*').order('nome'),
 *     [algumaDependencia]
 *   )
 */
export function useSupabaseQuery(queryFn, deps = []) {
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  const executar = useCallback(async () => {
    setCarregando(true)
    setErro(null)

    try {
      const { data, error } = await queryFn(supabase)

      if (error) {
        setErro(error)
        setDados(null)
      } else {
        setDados(data)
      }
    } catch (excecao) {
      setErro(excecao)
      setDados(null)
    } finally {
      setCarregando(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    let ativo = true

    executar().catch((e) => {
      if (ativo) setErro(e)
    })

    return () => {
      ativo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executar])

  return { dados, carregando, erro, refetch: executar }
}
