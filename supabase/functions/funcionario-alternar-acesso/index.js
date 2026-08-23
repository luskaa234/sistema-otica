// Edge Function: ativa/desativa o acesso de um funcionário — bane o login
// no Supabase Auth (sem apagar o usuário nem o histórico de vendas/comissões).
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
    const { funcionario_id: funcionarioId, ativo } = await req.json()
    if (!funcionarioId || typeof ativo !== 'boolean') {
      return jsonResponse({ error: 'funcionario_id e ativo são obrigatórios' }, 400)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: funcionario, error: erroBusca } = await supabase
      .from('funcionarios')
      .select('user_id')
      .eq('id', funcionarioId)
      .single()

    if (erroBusca || !funcionario) {
      return jsonResponse({ error: 'Funcionário não encontrado' }, 404)
    }

    if (funcionario.user_id) {
      await supabase.auth.admin.updateUserById(funcionario.user_id, {
        ban_duration: ativo ? 'none' : '876000h',
      })
    }

    await supabase.from('funcionarios').update({ ativo }).eq('id', funcionarioId)

    return jsonResponse({ ok: true })
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
