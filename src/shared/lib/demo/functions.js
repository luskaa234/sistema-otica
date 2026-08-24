// Réplica mínima das Edge Functions reais para o modo demo — mesma
// lógica de negócio (criar cobrança, calcular destinatários...), só que
// rodando em memória em vez de numa function do Supabase.
import { db, gerarId } from './seedData'
import { emailInternoCliente } from '../../utils/authCliente'
import { chamarRpc } from './rpc'

async function asaasCriarCobranca({ os_id: osId }) {
  const os = db.ordens_servico.find((o) => o.id === osId)
  if (!os) return { data: null, error: { message: 'OS não encontrada' } }

  const valor = Number(os.valor_total) - Number(os.desconto ?? 0)
  const pagamentoId = gerarId('pag')
  const dataVencimento = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)

  db.pagamentos.push({
    id: pagamentoId,
    os_id: osId,
    asaas_payment_id: `demo_${pagamentoId}`,
    valor,
    forma_pagamento: os.forma_pagamento,
    status: 'PENDING',
    data_pagamento: null,
    data_vencimento: dataVencimento,
    lembrete_enviado_em: null,
    invoice_url: `https://sandbox.asaas.com/i/demo_${pagamentoId}`,
    created_at: new Date().toISOString(),
  })

  return { data: { pagamento_id: pagamentoId, invoice_url: `https://sandbox.asaas.com/i/demo_${pagamentoId}` }, error: null }
}

async function enviarCampanha({ campanha_id: campanhaId }) {
  const campanha = db.campanhas_marketing.find((c) => c.id === campanhaId)
  if (!campanha) return { data: null, error: { message: 'Campanha não encontrada' } }

  const { data: destinatarios } = await chamarRpc('calcular_destinatarios_campanha', {
    p_segmento: campanha.segmento,
    p_inatividade_meses: campanha.inatividade_meses,
    p_clientes_selecionados: campanha.clientes_selecionados,
  })

  let sucesso = 0
  let falha = 0
  for (const destinatario of destinatarios ?? []) {
    const contatoValido = campanha.canal === 'whatsapp' ? Boolean(destinatario.telefone) : Boolean(destinatario.email)
    if (contatoValido) sucesso += 1
    else falha += 1
  }

  Object.assign(campanha, {
    status: 'enviada',
    data_envio: new Date().toISOString(),
    destinatarios_total: destinatarios?.length ?? 0,
    destinatarios_sucesso: sucesso,
    destinatarios_falha: falha,
  })

  return { data: { destinatarios_total: destinatarios?.length ?? 0, sucesso, falha }, error: null }
}

async function clienteSolicitarCodigo({ cpf }) {
  const digits = (cpf || '').replace(/\D/g, '')
  const cliente = db.clientes.find((c) => c.cpf === digits)
  if (!cliente) {
    return { data: { error: 'CPF não encontrado. Fale com a loja para se cadastrar.' }, error: null }
  }
  if (!cliente.user_id) cliente.user_id = `user-${cliente.id}`
  return { data: { email: emailInternoCliente(digits) }, error: null }
}

async function funcionarioConvidar({ nome, email, perfil, telefone, data_admissao: dataAdmissao }) {
  db.funcionarios.push({
    id: gerarId('func'),
    user_id: `user-demo-${Date.now()}`,
    nome,
    email,
    perfil,
    ativo: true,
    telefone: telefone || null,
    data_admissao: dataAdmissao || null,
    created_at: new Date().toISOString(),
  })
  return { data: { ok: true }, error: null }
}

async function funcionarioAlternarAcesso({ funcionario_id: funcionarioId, ativo }) {
  const funcionario = db.funcionarios.find((f) => f.id === funcionarioId)
  if (!funcionario) return { data: null, error: { message: 'Funcionário não encontrado' } }
  funcionario.ativo = ativo
  return { data: { ok: true }, error: null }
}

const FUNCOES = {
  'asaas-criar-cobranca': asaasCriarCobranca,
  'enviar-campanha': enviarCampanha,
  'cliente-solicitar-codigo': clienteSolicitarCodigo,
  'funcionario-convidar': funcionarioConvidar,
  'funcionario-alternar-acesso': funcionarioAlternarAcesso,
}

export async function invocarFunction(nome, { body } = {}) {
  const fn = FUNCOES[nome]
  if (!fn) return { data: null, error: { message: `Edge function demo desconhecida: ${nome}` } }
  try {
    return await fn(body ?? {})
  } catch (erro) {
    return { data: null, error: { message: erro.message } }
  }
}
