export function PageHeader({ titulo, descricao, acao }) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{titulo}</h1>
        {descricao && <p className="mt-1.5 text-sm text-gray-500">{descricao}</p>}
      </div>
      {acao}
    </div>
  )
}
