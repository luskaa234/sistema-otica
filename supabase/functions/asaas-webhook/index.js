// Edge Function: recebe webhooks da Asaas e atualiza o status do pagamento.
// Nunca usar polling — o status em `pagamentos` só muda a partir daqui.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const ASAAS_WEBHOOK_TOKEN = Deno.env.get('ASAAS_WEBHOOK_TOKEN')

const EVENTOS_PARA_STATUS = {
  PAYMENT_RECEIVED: 'RECEIVED',
  PAYMENT_CONFIRMED: 'CONFIRMED',
  PAYMENT_OVERDUE: 'OVERDUE',
  PAYMENT_DELETED: 'DELETED',
  PAYMENT_REFUNDED: 'REFUNDED',
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Método não permitido', { status: 405 })
  }

  // A Asaas envia o token configurado no cabeçalho asaas-access-token.
  if (ASAAS_WEBHOOK_TOKEN && req.headers.get('asaas-access-token') !== ASAAS_WEBHOOK_TOKEN) {
    return new Response('Não autorizado', { status: 401 })
  }

  try {
    const payload = await req.json()
    const evento = payload.event
    const pagamentoAsaas = payload.payment

    const novoStatus = EVENTOS_PARA_STATUS[evento]
    if (!novoStatus || !pagamentoAsaas?.id) {
      return new Response('ok', { status: 200 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    await supabase
      .from('pagamentos')
      .update({
        status: novoStatus,
        data_pagamento: pagamentoAsaas.paymentDate ?? null,
      })
      .eq('asaas_payment_id', pagamentoAsaas.id)

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response('Erro ao processar webhook', { status: 500 })
  }
})
