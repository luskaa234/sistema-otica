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
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {colunas.map((coluna) => (
              <th
                key={coluna.chave}
                className="px-4 py-3 text-left font-medium text-gray-600"
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
              className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
            >
              {colunas.map((coluna) => (
                <td key={coluna.chave} className="px-4 py-3 text-gray-800">
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
