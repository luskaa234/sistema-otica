export function validarCPF(cpf) {
  const digits = (cpf || '').replace(/\D/g, '')
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false

  const calcularDigito = (base) => {
    let soma = 0
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * (base.length + 1 - i)
    }
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }

  const digito1 = calcularDigito(digits.slice(0, 9))
  const digito2 = calcularDigito(digits.slice(0, 9) + digito1)

  return digits === digits.slice(0, 9) + String(digito1) + String(digito2)
}

export function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')
}

export function validarTelefone(telefone) {
  const digits = (telefone || '').replace(/\D/g, '')
  return digits.length === 10 || digits.length === 11
}
