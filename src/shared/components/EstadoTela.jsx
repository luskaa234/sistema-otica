export function Carregando({ texto = 'Carregando...' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      {texto}
    </div>
  )
}

export function Erro({ mensagem = 'Não foi possível carregar os dados.' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-red-600">
      <span>{mensagem}</span>
    </div>
  )
}

export function Vazio({ titulo = 'Nada por aqui ainda', descricao, acao }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <span className="text-base font-medium text-gray-700">{titulo}</span>
      {descricao && <span className="max-w-sm text-sm text-gray-500">{descricao}</span>}
      {acao}
    </div>
  )
}
