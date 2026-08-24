import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { PageHeader } from '../../../shared/components/PageHeader'
import { Button } from '../../../shared/components/Button'
import { Select } from '../../../shared/components/Select'
import { Badge } from '../../../shared/components/Badge'
import { TabelaGenerica } from '../../components/TabelaGenerica'
import { useSupabaseQuery } from '../../../shared/hooks/useSupabaseQuery'
import { formatarMoeda, formatarData } from '../../../shared/utils/formatters'
import { STATUS_OS_LABEL, STATUS_OS_COR } from '../../../shared/constants/statusOS'

const OPCOES_STATUS = [
  { value: 'todos', label: 'Todos' },
  ...Object.entries(STATUS_OS_LABEL).map(([value, label]) => ({ value, label })),
]

const OPCOES_POR_PAGINA = [25, 50, 100]

function useDebounce(valor, atrasoMs) {
  const [debounced, setDebounced] = useState(valor)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(valor), atrasoMs)
    return () => clearTimeout(timer)
  }, [valor, atrasoMs])
  return debounced
}

function estaAtrasada(os) {
  if (!os.prazo_entrega) return false
  if (['entregue', 'cancelado'].includes(os.status)) return false
  return new Date(os.prazo_entrega) < new Date(new Date().toDateString())
}

export default function ListaOS() {
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState('todos')
  const [vendedorId, setVendedorId] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [porPagina, setPorPagina] = useState(25)
  const [pagina, setPagina] = useState(1)

  const buscaDebounced = useDebounce(busca, 300)

  useEffect(() => {
    setPagina(1)
  }, [buscaDebounced, status, vendedorId, dataInicio, dataFim, porPagina])

  const { dados: vendedores } = useSupabaseQuery(
    (supabase) => supabase.from('funcionarios').select('id, nome').eq('perfil', 'vendedor').eq('ativo', true),
    []
  )

  const { dados, carregando, erro } = useSupabaseQuery(
    (supabase) =>
      supabase.rpc('listar_ordens_servico', {
        p_status: status,
        p_busca: buscaDebounced || null,
        p_vendedor_id: vendedorId || null,
        p_data_inicio: dataInicio || null,
        p_data_fim: dataFim || null,
        p_limit: porPagina,
        p_offset: (pagina - 1) * porPagina,
      }),
    [buscaDebounced, status, vendedorId, dataInicio, dataFim, porPagina, pagina]
  )

  const totalRegistros = dados?.[0]?.total_registros ?? 0
  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / porPagina))

  const colunas = useMemo(
    () => [
      { chave: 'numero', titulo: 'Nº', render: (linha) => `#${linha.numero}` },
      {
        chave: 'cliente_nome',
        titulo: 'Cliente',
        render: (linha) => (
          <Link
            to={`/admin/clientes/${linha.cliente_id}`}
            onClick={(e) => e.stopPropagation()}
            className="hover:text-blue-600 hover:underline"
          >
            {linha.cliente_nome}
          </Link>
        ),
      },
      { chave: 'vendedor_nome', titulo: 'Vendedor', render: (linha) => linha.vendedor_nome ?? '—' },
      { chave: 'created_at', titulo: 'Data', render: (linha) => formatarData(linha.created_at) },
      {
        chave: 'status',
        titulo: 'Status',
        render: (linha) => (
          <Badge className={STATUS_OS_COR[linha.status]}>{STATUS_OS_LABEL[linha.status]}</Badge>
        ),
      },
      {
        chave: 'valor_total',
        titulo: 'Valor total',
        render: (linha) => formatarMoeda(Number(linha.valor_total) - Number(linha.desconto ?? 0)),
      },
      {
        chave: 'prazo_entrega',
        titulo: 'Prazo de entrega',
        render: (linha) => (
          <span className={estaAtrasada(linha) ? 'font-medium text-red-600' : ''}>
            {linha.prazo_entrega ? formatarData(linha.prazo_entrega) : '—'}
          </span>
        ),
      },
    ],
    []
  )

  return (
    <div>
      <PageHeader
        titulo="Ordens de Serviço"
        descricao="Orçamentos e vendas em andamento"
        acao={
          <Button onClick={() => navigate('/admin/vendas/novo')}>
            <Plus size={16} />
            Novo Orçamento
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por cliente ou número da OS"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} options={OPCOES_STATUS} />
        <Select
          value={vendedorId}
          onChange={(e) => setVendedorId(e.target.value)}
          options={[
            { value: '', label: 'Todos os vendedores' },
            ...(vendedores ?? []).map((v) => ({ value: v.id, label: v.nome })),
          ]}
        />
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
      </div>

      <TabelaGenerica
        colunas={colunas}
        linhas={dados}
        carregando={carregando}
        onRowClick={(linha) => navigate(`/admin/vendas/${linha.id}`)}
        vazioTitulo="Nenhuma OS encontrada"
        vazioDescricao="Ajuste os filtros ou crie um novo orçamento."
      />

      {erro && <p className="mt-3 text-sm text-red-600">Não foi possível carregar as OS.</p>}

      {!carregando && totalRegistros > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span>Por página:</span>
            <Select
              value={porPagina}
              onChange={(e) => setPorPagina(Number(e.target.value))}
              options={OPCOES_POR_PAGINA.map((valor) => ({ value: valor, label: String(valor) }))}
            />
          </div>
          <div className="flex items-center gap-3">
            <span>
              Página {pagina} de {totalPaginas} · {totalRegistros} OS
            </span>
            <Button variant="secondary" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
              Anterior
            </Button>
            <Button
              variant="secondary"
              disabled={pagina >= totalPaginas}
              onClick={() => setPagina((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
