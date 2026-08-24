import { useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { PageHeader } from '../../../shared/components/PageHeader'
import { Select } from '../../../shared/components/Select'
import { Carregando } from '../../../shared/components/EstadoTela'
import { useSupabaseQuery } from '../../../shared/hooks/useSupabaseQuery'
import { formatarMoeda, formatarData } from '../../../shared/utils/formatters'

const COR_ENTRADA = '#16a34a'
const COR_SAIDA = '#dc2626'

const OPCOES_AGRUPAMENTO = [
  { value: 'dia', label: 'Por dia' },
  { value: 'semana', label: 'Por semana' },
  { value: 'mes', label: 'Por mês' },
]

function chaveAgrupamento(data, agrupamento) {
  const d = new Date(data)
  if (agrupamento === 'mes') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  if (agrupamento === 'semana') {
    const inicioAno = new Date(d.getFullYear(), 0, 1)
    const semana = Math.ceil(((d - inicioAno) / 86400000 + inicioAno.getDay() + 1) / 7)
    return `${d.getFullYear()}-S${semana}`
  }
  return d.toISOString().slice(0, 10)
}

function dataPadrao(diasAtras) {
  const d = new Date()
  d.setDate(d.getDate() - diasAtras)
  return d.toISOString().slice(0, 10)
}

export default function FluxoCaixa() {
  const [dataInicio, setDataInicio] = useState(dataPadrao(30))
  const [dataFim, setDataFim] = useState(new Date().toISOString().slice(0, 10))
  const [agrupamento, setAgrupamento] = useState('dia')

  const { dados: entradas, carregando: carregandoEntradas } = useSupabaseQuery(
    (supabase) =>
      supabase
        .from('pagamentos')
        .select('valor, data_pagamento')
        .in('status', ['RECEIVED', 'CONFIRMED'])
        .gte('data_pagamento', dataInicio)
        .lte('data_pagamento', dataFim),
    [dataInicio, dataFim]
  )

  const { dados: saidas, carregando: carregandoSaidas } = useSupabaseQuery(
    (supabase) =>
      supabase
        .from('contas_pagar')
        .select('valor, data_pagamento')
        .eq('status', 'pago')
        .gte('data_pagamento', dataInicio)
        .lte('data_pagamento', dataFim),
    [dataInicio, dataFim]
  )

  const { dados: totalEntradasHistorico } = useSupabaseQuery(
    (supabase) => supabase.from('pagamentos').select('valor').in('status', ['RECEIVED', 'CONFIRMED']),
    []
  )
  const { dados: totalSaidasHistorico } = useSupabaseQuery(
    (supabase) => supabase.from('contas_pagar').select('valor').eq('status', 'pago'),
    []
  )
  const { dados: pendentesReceber } = useSupabaseQuery(
    (supabase) => supabase.from('pagamentos').select('valor').in('status', ['PENDING', 'OVERDUE']),
    []
  )
  const { dados: pendentesPagar } = useSupabaseQuery(
    (supabase) => supabase.from('contas_pagar').select('valor').eq('status', 'pendente'),
    []
  )

  const carregando = carregandoEntradas || carregandoSaidas

  const saldoAtual = useMemo(() => {
    const totalEntradas = (totalEntradasHistorico ?? []).reduce((s, p) => s + Number(p.valor), 0)
    const totalSaidas = (totalSaidasHistorico ?? []).reduce((s, c) => s + Number(c.valor), 0)
    return totalEntradas - totalSaidas
  }, [totalEntradasHistorico, totalSaidasHistorico])

  const saldoProjetado = useMemo(() => {
    const aReceber = (pendentesReceber ?? []).reduce((s, p) => s + Number(p.valor), 0)
    const aPagar = (pendentesPagar ?? []).reduce((s, c) => s + Number(c.valor), 0)
    return saldoAtual + aReceber - aPagar
  }, [saldoAtual, pendentesReceber, pendentesPagar])

  const dadosGrafico = useMemo(() => {
    const grupos = {}

    for (const entrada of entradas ?? []) {
      const chave = chaveAgrupamento(entrada.data_pagamento, agrupamento)
      grupos[chave] ??= { periodo: chave, entradas: 0, saidas: 0 }
      grupos[chave].entradas += Number(entrada.valor)
    }
    for (const saida of saidas ?? []) {
      const chave = chaveAgrupamento(saida.data_pagamento, agrupamento)
      grupos[chave] ??= { periodo: chave, entradas: 0, saidas: 0 }
      grupos[chave].saidas += Number(saida.valor)
    }

    return Object.values(grupos).sort((a, b) => a.periodo.localeCompare(b.periodo))
  }, [entradas, saidas, agrupamento])

  const movimentos = useMemo(() => {
    const lista = [
      ...(entradas ?? []).map((e) => ({ tipo: 'entrada', valor: Number(e.valor), data: e.data_pagamento })),
      ...(saidas ?? []).map((s) => ({ tipo: 'saida', valor: Number(s.valor), data: s.data_pagamento })),
    ]
    return lista.sort((a, b) => new Date(b.data) - new Date(a.data))
  }, [entradas, saidas])

  return (
    <div>
      <PageHeader titulo="Fluxo de Caixa" descricao="Entradas x saídas por período" />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <input
          type="date"
          value={dataInicio}
          onChange={(e) => setDataInicio(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <input
          type="date"
          value={dataFim}
          onChange={(e) => setDataFim(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <Select value={agrupamento} onChange={(e) => setAgrupamento(e.target.value)} options={OPCOES_AGRUPAMENTO} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-100 shadow-soft bg-white p-5">
          <p className="text-sm text-gray-500">Saldo atual em caixa</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{formatarMoeda(saldoAtual)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 shadow-soft bg-white p-5">
          <p className="text-sm text-gray-500">Saldo projetado (com contas já cadastradas)</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{formatarMoeda(saldoProjetado)}</p>
        </div>
      </div>

      {carregando && <Carregando />}

      {!carregando && (
        <>
          <div className="mb-6 h-72 rounded-xl border border-gray-100 shadow-soft bg-white p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="periodo" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => formatarMoeda(v)} width={90} />
                <Tooltip formatter={(valor) => formatarMoeda(valor)} />
                <Legend />
                <Bar dataKey="entradas" name="Entradas" fill={COR_ENTRADA} radius={[4, 4, 0, 0]} />
                <Bar dataKey="saidas" name="Saídas" fill={COR_SAIDA} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h3 className="mb-2 text-sm font-medium text-gray-500">Movimentações do período</h3>
          <div className="space-y-1 text-sm">
            {movimentos.map((mov, indice) => (
              <div key={indice} className="flex justify-between rounded-lg border border-gray-100 px-3 py-2">
                <span className={mov.tipo === 'entrada' ? 'text-green-700' : 'text-red-700'}>
                  {mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                </span>
                <span className="text-gray-500">{formatarData(mov.data)}</span>
                <span className="font-medium text-gray-900">{formatarMoeda(mov.valor)}</span>
              </div>
            ))}
            {movimentos.length === 0 && <p className="text-gray-400">Nenhuma movimentação no período.</p>}
          </div>
        </>
      )}
    </div>
  )
}
