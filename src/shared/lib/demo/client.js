import { criarQueryBuilder } from './queryBuilder'
import { chamarRpc } from './rpc'
import { invocarFunction } from './functions'
import { demoAuth } from './auth'
import { demoStorage } from './storage'

/**
 * Cliente demo: mesma "forma" de API do supabase-js (from/rpc/functions/
 * auth/storage), mas tudo operando em memória — nenhuma chamada de rede.
 * Ativado via VITE_DEMO_MODE=true (ver shared/lib/supabaseClient.js).
 */
export function criarClienteDemo() {
  return {
    from(tabela) {
      return criarQueryBuilder(tabela)
    },
    rpc(nome, params) {
      return chamarRpc(nome, params)
    },
    functions: {
      invoke(nome, opcoes) {
        return invocarFunction(nome, opcoes)
      },
    },
    auth: demoAuth,
    storage: demoStorage,
  }
}
