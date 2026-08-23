import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { PageHeader } from '../../../shared/components/PageHeader'
import { Button } from '../../../shared/components/Button'
import { Input } from '../../../shared/components/Input'
import { Carregando } from '../../../shared/components/EstadoTela'
import { useSupabaseQuery } from '../../../shared/hooks/useSupabaseQuery'
import { formatarMoeda, formatarData } from '../../../shared/utils/formatters'

const COR_PRINCIPAL = '#2563eb'

function dataPadrao(diasAtras) {
  const d = new Date()
  d.setDate(d.getDate() - diasAtras)
  return d.toISOString().slice(0, 10)
}

function exportarCsv(linhas, colunas, nomeArquivo) {
  const cabecalho = colunas.map((c) => c.titulo).join(';')
  const corpo = linhas.map((linha) => colunas.map((c) => c.valor(linha)).join(';')).join('\n')
  const blob = new Blob([`${cabecalho}\n${corpo}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  link.click()
  URL.revokeObjectURL(url)
}

export default function Relatorios() {
  const [dataInicio, setDataInicio] = useState(dataPadrao(30))
  const [dataFim, setDataFim] = useState(new Date().toISOString().slice(0, 10))

  const { dados: resumo, carregando: carregandoResumo } = useSupabaseQuery(
    (supabase) => supabase.rpc('resumo_vendas_periodo', { p_data_inicio: dataInicio, p_data_fim: dataFim }).single(),
    [dataInicio, dataFim]
  )

  const { dados: topProdutos, carregando: carregandoProdutos } = useSupabaseQuery(
    (supabase) =>
      supabase.rpc('produtos_mais_vendidos', { p_data_inicio: dataInicio, p_data_fim: dataFim, p_limit: 5 }),
    [dataInicio, dataFim]
  )

  const { dados: vendedores, carregando: carregandoVendedores } = useSupabaseQuery(
    (supabase) => supabase.rpc('vendas_por_vendedor', { p_data_inicio: dataInicio, p_data_fim: dataFim }),
    [dataInicio, dataFim]
  )

  const { dados: vendasDetalhadas } = useSupabaseQuery(
    (supabase) =>
      supabase
        .from('ordens_servico')
        .select('numero, created_at, valor_total, desconto, status, clientes(nome)')
        .not('status', 'in', '(orcamento,cancelado)')
        .gte('created_at', dataInicio)
        .lte('created_at', `${dataFim}T23:59:59`)
        .order('created_at', { ascending: false }),
    [dataInicio, dataFim]
  )

  const dadosGraficoDiario = useMemo(() => {
    const grupos = {}
    for (const venda of vendasDetalhadas ?? []) {
      const dia = venda.created_at.slice(0, 10)
      grupos[dia] ??= { dia, total: 0 }
      grupos[dia].total += Number(venda.valor_total) - Number(venda.desconto ?? 0)
    }
    return Object.values(grupos).sort((a, b) => a.dia.localeCompare(b.dia))
  }, [vendasDetalhadas])

  const carregando = carregandoResumo || carregandoProdutos || carregandoVendedores

  return (
    <div>
      <PageHeader titulo="Relatórios" descricao="Vendas por período, produtos, ticket médio e conversão" />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <Input label="De" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        <Input label="Até" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
      </div>

      {carregando && <Carregando />}

      {!carregando && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <CardIndicador titulo="Total vendido" valor={formatarMoeda(resumo?.total_vendido ?? 0)} />
            <CardIndicador titulo="Ticket médio" valor={formatarMoeda(resumo?.ticket_medio ?? 0)} />
            <CardIndicador titulo="Vendas fechadas" valor={resumo?.qtd_vendas ?? 0} />
            <CardIndicador
              titulo="Conversão orçamento → venda"
              valor={`${resumo?.taxa_conversao ?? 0}%`}
            />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-medium text-gray-700">Vendas por dia</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosGraficoDiario}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="dia" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v) => formatarMoeda(v)} width={85} />
                    <Tooltip formatter={(valor) => formatarMoeda(valor)} />
                    <Bar dataKey="total" name="Vendido" fill={COR_PRINCIPAL} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-medium text-gray-700">Produtos mais vendidos</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={(topProdutos ?? []).map((p) => ({
                      nome: [p.marca, p.modelo].filter(Boolean).join(' '),
                      quantidade: Number(p.quantidade_vendida),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <YAxis type="category" dataKey="nome" width={120} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <Tooltip />
                    <Bar dataKey="quantidade" name="Quantidade vendida" fill={COR_PRINCIPAL} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-medium text-gray-700">Comparativo por vendedor</h3>
            <div className="space-y-2 text-sm">
              {vendedores?.map((v) => (
                <div key={v.funcionario_id} className="flex justify-between">
                  <span>{v.nome}</span>
                  <span>
                    {v.quantidade_vendas} vendas · {formatarMoeda(v.valor_total)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">Vendas do período</h3>
              <Button
                variant="secondary"
                onClick={() =>
                  exportarCsv(
                    vendasDetalhadas ?? [],
                    [
                      { titulo: 'OS', valor: (v) => v.numero },
                      { titulo: 'Data', valor: (v) => formatarData(v.created_at) },
                      { titulo: 'Cliente', valor: (v) => v.clientes?.nome ?? '' },
                      { titulo: 'Valor', valor: (v) => Number(v.valor_total) - Number(v.desconto ?? 0) },
                    ],
                    `vendas-${dataInicio}-a-${dataFim}.csv`
                  )
                }
              >
                <Download size={14} />
                Exportar CSV
              </Button>
            </div>
            <div className="space-y-1 text-sm">
              {vendasDetalhadas?.map((venda) => (
                <div key={venda.numero} className="flex justify-between border-b border-gray-50 py-1">
                  <span>
                    #{venda.numero} · {venda.clientes?.nome}
                  </span>
                  <span>{formatarData(venda.created_at)}</span>
                  <span className="font-medium text-gray-900">
                    {formatarMoeda(Number(venda.valor_total) - Number(venda.desconto ?? 0))}
                  </span>
                </div>
              ))}
              {(!vendasDetalhadas || vendasDetalhadas.length === 0) && (
                <p className="text-gray-400">Nenhuma venda no período.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function CardIndicador({ titulo, valor }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{titulo}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{valor}</p>
    </div>
  )
}
