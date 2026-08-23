// Edge Function: dispara uma campanha de marketing para o segmento calculado.
//
// IMPORTANTE: o envio real de WhatsApp/e-mail depende de um provedor externo
// (ex: WhatsApp Business API, Resend/SendGrid para e-mail) que ainda não está
// configurado neste projeto (isso é trabalho do Módulo 8 — Configurações).
// Esta função já calcula os destinatários reais a partir do banco e resolve
// as variáveis da mensagem; o bloco marcado como TODO é o único ponto que
// precisa ser trocado por uma chamada real ao provedor quando ele existir.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { campanha_id: campanhaId } = await req.json()
    if (!campanhaId) return jsonResponse({ error: 'campanha_id é obrigatório' }, 400)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: campanha, error: erroCampanha } = await supabase
      .from('campanhas_marketing')
      .select('*')
      .eq('id', campanhaId)
      .single()

    if (erroCampanha || !campanha) {
      return jsonResponse({ error: 'Campanha não encontrada' }, 404)
    }

    const { data: destinatarios, error: erroDestinatarios } = await supabase.rpc(
      'calcular_destinatarios_campanha',
      {
        p_segmento: campanha.segmento,
        p_inatividade_meses: campanha.inatividade_meses,
        p_clientes_selecionados: campanha.clientes_selecionados,
      }
    )

    if (erroDestinatarios) {
      return jsonResponse({ error: 'Falha ao calcular destinatários' }, 500)
    }

    let sucesso = 0
    let falha = 0

    for (const destinatario of destinatarios ?? []) {
      const contatoValido =
        campanha.canal === 'whatsapp' ? Boolean(destinatario.telefone) : Boolean(destinatario.email)

      if (!contatoValido) {
        falha += 1
        continue
      }

      const mensagemPersonalizada = campanha.mensagem
        .replaceAll('{nome_cliente}', destinatario.nome ?? '')
        .replaceAll(
          '{ultima_compra}',
          destinatario.ultima_compra ? new Date(destinatario.ultima_compra).toLocaleDateString('pt-BR') : ''
        )

      // TODO: substituir por uma chamada real ao provedor de WhatsApp/e-mail
      // configurado em Configurações (Módulo 8), usando `mensagemPersonalizada`
      // e `destinatario.telefone` ou `destinatario.email` conforme `campanha.canal`.
      void mensagemPersonalizada
      sucesso += 1
    }

    await supabase
      .from('campanhas_marketing')
      .update({
        status: 'enviada',
        data_envio: new Date().toISOString(),
        destinatarios_total: destinatarios?.length ?? 0,
        destinatarios_sucesso: sucesso,
        destinatarios_falha: falha,
      })
      .eq('id', campanhaId)

    return jsonResponse({ destinatarios_total: destinatarios?.length ?? 0, sucesso, falha })
  } catch (err) {
    console.error(err)
    return jsonResponse({ error: 'Erro inesperado ao disparar campanha' }, 500)
  }
})

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
