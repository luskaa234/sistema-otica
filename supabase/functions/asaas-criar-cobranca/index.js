// Edge Function: cria uma cobrança na Asaas a partir de uma Ordem de Serviço.
// A chave da Asaas (ASAAS_API_KEY) só existe aqui, nunca no frontend.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')
const ASAAS_BASE_URL = Deno.env.get('ASAAS_BASE_URL') ?? 'https://sandbox.asaas.com/api/v3'
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
    const { os_id: osId } = await req.json()
    if (!osId) {
      return jsonResponse({ error: 'os_id é obrigatório' }, 400)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: os, error: osError } = await supabase
      .from('ordens_servico')
      .select('id, valor_total, desconto, cliente_id, clientes ( nome, cpf, email )')
      .eq('id', osId)
      .single()

    if (osError || !os) {
      return jsonResponse({ error: 'Ordem de serviço não encontrada' }, 404)
    }

    const valor = Number(os.valor_total) - Number(os.desconto ?? 0)

    const clienteAsaas = await buscarOuCriarClienteAsaas(os.clientes)
    const dataVencimento = proximaDataVencimento()

    const cobranca = await asaasFetch('/payments', {
      method: 'POST',
      body: {
        customer: clienteAsaas.id,
        billingType: 'UNDEFINED',
        value: valor,
        dueDate: dataVencimento,
        externalReference: os.id,
      },
    })

    const { error: insertError } = await supabase.from('pagamentos').insert({
      os_id: os.id,
      asaas_payment_id: cobranca.id,
      valor,
      status: cobranca.status ?? 'PENDING',
      invoice_url: cobranca.invoiceUrl ?? null,
      data_vencimento: dataVencimento,
    })

    if (insertError) {
      return jsonResponse({ error: 'Cobrança criada, mas falhou ao salvar no banco' }, 500)
    }

    return jsonResponse({ pagamento_id: cobranca.id, invoice_url: cobranca.invoiceUrl })
  } catch (err) {
    console.error(err)
    return jsonResponse({ error: 'Erro inesperado ao criar cobrança' }, 500)
  }
})

async function buscarOuCriarClienteAsaas(cliente) {
  const busca = await asaasFetch(`/customers?cpfCnpj=${cliente.cpf}`)
  if (busca.data?.length > 0) return busca.data[0]

  return asaasFetch('/customers', {
    method: 'POST',
    body: {
      name: cliente.nome,
      cpfCnpj: cliente.cpf,
      email: cliente.email,
    },
  })
}

async function asaasFetch(path, options = {}) {
  const response = await fetch(`${ASAAS_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      access_token: ASAAS_API_KEY,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    const detalhe = await response.text()
    throw new Error(`Asaas ${path} falhou: ${detalhe}`)
  }

  return response.json()
}

function proximaDataVencimento() {
  const data = new Date()
  data.setDate(data.getDate() + 3)
  return data.toISOString().slice(0, 10)
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
