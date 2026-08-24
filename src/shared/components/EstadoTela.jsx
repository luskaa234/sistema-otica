import { AlertCircle, Inbox } from 'lucide-react'

export function Carregando({ texto = 'Carregando...' }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-16 text-sm text-gray-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-brand-600" />
      {texto}
    </div>
  )
}

export function Erro({ mensagem = 'Não foi possível carregar os dados.' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 py-14 text-sm text-red-700">
      <AlertCircle size={22} className="text-red-400" />
      <span>{mensagem}</span>
    </div>
  )
}

export function Vazio({ titulo = 'Nada por aqui ainda', descricao, acao }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-16 text-center">
      <Inbox size={26} className="mb-1 text-gray-300" />
      <span className="text-base font-medium text-gray-700">{titulo}</span>
      {descricao && <span className="max-w-sm text-sm text-gray-500">{descricao}</span>}
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  )
}
