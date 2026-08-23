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
