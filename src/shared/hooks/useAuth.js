import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * Expõe a sessão de autenticação do Supabase e o perfil vinculado
 * (funcionário ou cliente). O RLS do banco é a autoridade final sobre
 * o que cada perfil pode ler/escrever — este hook só orienta a UI
 * (quais menus/telas mostrar).
 */
export function useAuth() {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil] = useState(null) // { tipo: 'funcionario' | 'cliente', ...dados }
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true

    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return
      setSession(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, novaSession) => {
      setSession(novaSession)
    })

    return () => {
      ativo = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let ativo = true

    async function carregarPerfil() {
      if (!session?.user) {
        setPerfil(null)
        setCarregando(false)
        return
      }

      setCarregando(true)

      const { data: funcionario } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (!ativo) return

      if (funcionario) {
        setPerfil({ tipo: 'funcionario', ...funcionario })
        setCarregando(false)
        return
      }

      const { data: cliente } = await supabase
        .from('clientes')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (!ativo) return

      setPerfil(cliente ? { tipo: 'cliente', ...cliente } : null)
      setCarregando(false)
    }

    carregarPerfil()

    return () => {
      ativo = false
    }
  }, [session])

  async function logout() {
    await supabase.auth.signOut()
  }

  return {
    session,
    perfil,
    carregando,
    logado: Boolean(session),
    logout,
  }
}
