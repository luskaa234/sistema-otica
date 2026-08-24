// Réplica mínima de supabase.auth para o modo demo. Começa já autenticado
// como Admin (combinado com VITE_DEV_BYPASS_AUTH, dá pra testar tudo sem
// nenhuma fricção), mas os fluxos reais de login também funcionam.
import { db, usuarioAdmin } from './seedData'
import { emailInternoCliente } from '../../utils/authCliente'

let sessaoAtual = { user: { id: usuarioAdmin.id, email: usuarioAdmin.email } }
const ouvintes = new Set()

function notificar(evento) {
  for (const cb of ouvintes) cb(evento, sessaoAtual)
}

function definirSessaoPorUserId(userId) {
  sessaoAtual = userId ? { user: { id: userId } } : null
  notificar(sessaoAtual ? 'SIGNED_IN' : 'SIGNED_OUT')
}

export const demoAuth = {
  async getSession() {
    return { data: { session: sessaoAtual }, error: null }
  },

  onAuthStateChange(callback) {
    ouvintes.add(callback)
    return { data: { subscription: { unsubscribe: () => ouvintes.delete(callback) } } }
  },

  async signOut() {
    definirSessaoPorUserId(null)
    return { error: null }
  },

  async signInWithPassword({ email }) {
    const emailBusca = (email || '').toLowerCase()

    const funcionario = db.funcionarios.find((f) => f.email.toLowerCase() === emailBusca)
    if (funcionario) {
      definirSessaoPorUserId(funcionario.user_id)
      return { data: { session: sessaoAtual }, error: null }
    }

    const cliente = db.clientes.find((c) => emailInternoCliente(c.cpf) === emailBusca)
    if (cliente) {
      if (!cliente.user_id) cliente.user_id = `user-${cliente.id}`
      definirSessaoPorUserId(cliente.user_id)
      return { data: { session: sessaoAtual }, error: null }
    }

    // Modo demo: credencial não encontrada ainda entra, como admin, para
    // nunca travar quem só quer testar o sistema.
    definirSessaoPorUserId(usuarioAdmin.id)
    return { data: { session: sessaoAtual }, error: null }
  },

  async signInWithOtp() {
    return { data: {}, error: null }
  },

  async verifyOtp({ email }) {
    const cliente = db.clientes.find((c) => emailInternoCliente(c.cpf) === (email || '').toLowerCase())
    if (cliente) {
      if (!cliente.user_id) cliente.user_id = `user-${cliente.id}`
      definirSessaoPorUserId(cliente.user_id)
    } else {
      definirSessaoPorUserId(usuarioAdmin.id)
    }
    return { data: { session: sessaoAtual }, error: null }
  },

  async updateUser() {
    return { data: {}, error: null }
  },

  admin: {
    async createUser({ email }) {
      const userId = `user-demo-${Date.now()}`
      return { data: { user: { id: userId, email } }, error: null }
    },
    async inviteUserByEmail(email) {
      const userId = `user-demo-${Date.now()}`
      return { data: { user: { id: userId, email } }, error: null }
    },
    async updateUserById() {
      return { data: {}, error: null }
    },
  },
}
