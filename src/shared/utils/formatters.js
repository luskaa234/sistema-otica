export function formatarCPF(cpf) {
  const digits = (cpf || '').replace(/\D/g, '')
  if (digits.length !== 11) return cpf || ''
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export function formatarTelefone(telefone) {
  const digits = (telefone || '').replace(/\D/g, '')
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  return telefone || ''
}

export function formatarMoeda(valor) {
  const numero = Number(valor) || 0
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatarData(data) {
  if (!data) return ''
  const d = new Date(data)
  return d.toLocaleDateString('pt-BR')
}

/** Aplica a máscara de telefone conforme o usuário digita (uso em onChange). */
export function mascararTelefone(valor) {
  const digits = (valor || '').replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, (_, ddd, p1, p2) =>
      p2 ? `(${ddd}) ${p1}-${p2}` : p1 ? `(${ddd}) ${p1}` : ddd ? `(${ddd}` : ''
    )
  }
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, (_, ddd, p1, p2) =>
    p2 ? `(${ddd}) ${p1}-${p2}` : p1 ? `(${ddd}) ${p1}` : ddd ? `(${ddd}` : ''
  )
}

/** Aplica a máscara de CPF conforme o usuário digita (uso em onChange). */
export function mascararCPF(valor) {
  const digits = (valor || '').replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

/** Aplica a máscara de CEP conforme o usuário digita (uso em onChange). */
export function mascararCEP(valor) {
  const digits = (valor || '').replace(/\D/g, '').slice(0, 8)
  return digits.replace(/(\d{5})(\d{1,3})/, '$1-$2')
}
