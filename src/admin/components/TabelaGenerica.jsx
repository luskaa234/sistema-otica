import { Carregando, Vazio } from '../../shared/components/EstadoTela'

/**
 * Tabela genérica reutilizada pelas listagens do admin.
 *
 * colunas: [{ chave, titulo, render? }]
 * linhas: array de objetos de dados
 */
export function TabelaGenerica({
  colunas,
  linhas,
  carregando,
  vazioTitulo = 'Nenhum registro encontrado',
  vazioDescricao,
  onRowClick,
}) {
  if (carregando) return <Carregando />
  if (!linhas || linhas.length === 0) {
    return <Vazio titulo={vazioTitulo} descricao={vazioDescricao} />
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-soft">
      <table className="min-w-full divide-y divide-gray-100 text-sm">
        <thead className="bg-gray-50/80">
          <tr>
            {colunas.map((coluna) => (
              <th
                key={coluna.chave}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                {coluna.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {linhas.map((linha, index) => (
            <tr
              key={linha.id ?? index}
              onClick={() => onRowClick?.(linha)}
              className={onRowClick ? 'cursor-pointer transition-colors hover:bg-brand-50/40' : ''}
            >
              {colunas.map((coluna) => (
                <td key={coluna.chave} className="px-4 py-3.5 text-gray-800">
                  {coluna.render ? coluna.render(linha) : linha[coluna.chave]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
