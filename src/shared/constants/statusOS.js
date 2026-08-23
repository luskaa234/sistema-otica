export const ORDEM_STATUS_OS = ['orcamento', 'aprovado', 'em_producao', 'pronto', 'entregue']

export const STATUS_OS_LABEL = {
  orcamento: 'Orçamento',
  aprovado: 'Aprovado',
  em_producao: 'Em produção',
  pronto: 'Pronto para retirada',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

export const STATUS_OS_COR = {
  orcamento: 'bg-gray-100 text-gray-700',
  aprovado: 'bg-blue-100 text-blue-700',
  em_producao: 'bg-amber-100 text-amber-700',
  pronto: 'bg-purple-100 text-purple-700',
  entregue: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-700',
}

export function proximoStatus(statusAtual) {
  const indiceAtual = ORDEM_STATUS_OS.indexOf(statusAtual)
  if (indiceAtual === -1 || indiceAtual === ORDEM_STATUS_OS.length - 1) return null
  return ORDEM_STATUS_OS[indiceAtual + 1]
}
