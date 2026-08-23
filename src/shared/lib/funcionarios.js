import { supabase } from './supabaseClient'

export async function convidarFuncionario({ nome, email, perfil, telefone, data_admissao }) {
  const { data, error } = await supabase.functions.invoke('funcionario-convidar', {
    body: { nome, email, perfil, telefone, data_admissao },
  })
  if (error || data?.error) throw new Error(data?.error ?? error?.message)
  return data
}

export async function alternarAcessoFuncionario(funcionarioId, ativo) {
  const { data, error } = await supabase.functions.invoke('funcionario-alternar-acesso', {
    body: { funcionario_id: funcionarioId, ativo },
  })
  if (error || data?.error) throw new Error(data?.error ?? error?.message)
  return data
}
