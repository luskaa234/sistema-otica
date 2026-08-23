/**
 * O Supabase Auth só autentica por e-mail (ou telefone). Para permitir login
 * por CPF, cada cliente ganha um e-mail interno sintético derivado do CPF —
 * nunca exibido nem usado para contato, só como identificador de auth.
 */
export function emailInternoCliente(cpf) {
  const digits = (cpf || '').replace(/\D/g, '')
  return `${digits}@clientes.oticamontesinai.internal`
}
