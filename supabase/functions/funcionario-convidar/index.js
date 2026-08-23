// Edge Function: convida um novo funcionário por e-mail (via Supabase Auth)
// e cria o registro correspondente em `funcionarios`.
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
    const { nome, email, perfil, telefone, data_admissao: dataAdmissao } = await req.json()

    if (!nome || !email || !perfil) {
      return jsonResponse({ error: 'nome, email e perfil são obrigatórios' }, 400)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: convite, error: erroConvite } = await supabase.auth.admin.inviteUserByEmail(email)
    if (erroConvite) {
      return jsonResponse({ error: 'Não foi possível enviar o convite. Verifique o e-mail.' }, 500)
    }

    const { error: erroInsert } = await supabase.from('funcionarios').insert({
      user_id: convite.user.id,
      nome,
      email,
      perfil,
      telefone: telefone || null,
      data_admissao: dataAdmissao || null,
      ativo: true,
    })

    if (erroInsert) {
      return jsonResponse({ error: 'Convite enviado, mas falhou ao salvar o funcionário.' }, 500)
    }

    return jsonResponse({ ok: true })
  } catch (err) {
    console.error(err)
    return jsonResponse({ error: 'Erro inesperado ao convidar funcionário' }, 500)
  }
})

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
