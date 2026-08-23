export async function buscarEnderecoPorCep(cep) {
  const digits = (cep || '').replace(/\D/g, '')
  if (digits.length !== 8) return null

  const resposta = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
  if (!resposta.ok) return null

  const dados = await resposta.json()
  if (dados.erro) return null

  return {
    endereco: dados.logradouro || '',
    bairro: dados.bairro || '',
    cidade: dados.localidade || '',
    uf: dados.uf || '',
  }
}
