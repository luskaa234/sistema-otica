// Edge Function: primeiro acesso (ou recuperação) do cliente por CPF.
// Localiza (ou vincula) o auth.users do cliente e envia um código de acesso
// por e-mail via Supabase Auth (OTP nativo — não depende de provedor externo).
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function emailInternoCliente(cpf) {
  const digits = (cpf || '').replace(/\D/g, '')
  return `${digits}@clientes.oticamontesinai.internal`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { cpf } = await req.json()
    const digits = (cpf || '').replace(/\D/g, '')

    if (digits.length !== 11) {
      return jsonResponse({ error: 'CPF inválido' }, 400)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: cliente, error: erroCliente } = await supabase
      .from('clientes')
      .select('id, user_id')
      .eq('cpf', digits)
      .maybeSingle()

    if (erroCliente || !cliente) {
      return jsonResponse({ error: 'CPF não encontrado. Fale com a loja para se cadastrar.' }, 404)
    }

    const emailInterno = emailInternoCliente(digits)

    if (!cliente.user_id) {
      const { data: novoUsuario, error: erroCriar } = await supabase.auth.admin.createUser({
        email: emailInterno,
        email_confirm: true,
        password: crypto.randomUUID(),
      })

      if (erroCriar) {
        return jsonResponse({ error: 'Não foi possível preparar o acesso.' }, 500)
      }

      await supabase.from('clientes').update({ user_id: novoUsuario.user.id }).eq('id', cliente.id)
    }

    const { error: erroOtp } = await supabase.auth.signInWithOtp({ email: emailInterno })
    if (erroOtp) {
      return jsonResponse({ error: 'Não foi possível enviar o código.' }, 500)
    }

    return jsonResponse({ email: emailInterno })
  } catch (err) {
    console.error(err)
    return jsonResponse({ error: 'Erro inesperado' }, 500)
  }
})

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
