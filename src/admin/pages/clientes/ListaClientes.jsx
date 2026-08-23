import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { PageHeader } from '../../../shared/components/PageHeader'
import { Button } from '../../../shared/components/Button'
import { Select } from '../../../shared/components/Select'
import { TabelaGenerica } from '../../components/TabelaGenerica'
import { useSupabaseQuery } from '../../../shared/hooks/useSupabaseQuery'
import { formatarTelefone, formatarMoeda, formatarData } from '../../../shared/utils/formatters'

const OPCOES_ATIVO = [
  { value: '', label: 'Ativos e inativos' },
  { value: 'true', label: 'Somente ativos' },
  { value: 'false', label: 'Somente inativos' },
]

const OPCOES_RECEITA = [
  { value: '', label: 'Com ou sem receita' },
  { value: 'true', label: 'Com receita ativa' },
  { value: 'false', label: 'Sem receita ativa' },
]

const OPCOES_ORDENACAO = [
  { value: 'nome', label: 'Nome (A-Z)' },
  { value: 'ultima_compra', label: 'Última compra' },
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

export default function ListaClientes() {
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [ativo, setAtivo] = useState('')
  const [temReceita, setTemReceita] = useState('')
  const [ordenar, setOrdenar] = useState('nome')
  const [porPagina, setPorPagina] = useState(25)
  const [pagina, setPagina] = useState(1)

  const buscaDebounced = useDebounce(busca, 300)

  useEffect(() => {
    setPagina(1)
  }, [buscaDebounced, ativo, temReceita, ordenar, porPagina])

  const { dados, carregando, erro } = useSupabaseQuery(
    (supabase) =>
      supabase.rpc('listar_clientes_resumo', {
        p_busca: buscaDebounced || null,
        p_ativo: ativo === '' ? null : ativo === 'true',
        p_tem_receita: temReceita === '' ? null : temReceita === 'true',
        p_ordenar: ordenar,
        p_limit: porPagina,
        p_offset: (pagina - 1) * porPagina,
      }),
    [buscaDebounced, ativo, temReceita, ordenar, porPagina, pagina]
  )

  const totalRegistros = dados?.[0]?.total_registros ?? 0
  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / porPagina))

  const colunas = useMemo(
    () => [
      {
        chave: 'nome',
        titulo: 'Cliente',
        render: (linha) => (
          <div className="flex items-center gap-3">
            {linha.foto_url ? (
              <img
                src={linha.foto_url}
                alt={linha.nome}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
                {linha.nome?.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900">{linha.nome}</p>
              {!linha.ativo && <span className="text-xs text-gray-400">Inativo</span>}
            </div>
          </div>
        ),
      },
      {
        chave: 'telefone',
        titulo: 'Telefone',
        render: (linha) => formatarTelefone(linha.telefone),
      },
      {
        chave: 'ultima_compra',
        titulo: 'Última compra',
        render: (linha) => (linha.ultima_compra ? formatarData(linha.ultima_compra) : '—'),
      },
      {
        chave: 'total_gasto',
        titulo: 'Total gasto',
        render: (linha) => formatarMoeda(linha.total_gasto),
      },
    ],
    []
  )

  return (
    <div>
      <PageHeader
        titulo="Clientes"
        descricao="Busca, cadastro e histórico de clientes"
        acao={
          <Button onClick={() => navigate('/admin/clientes/novo')}>
            <Plus size={16} />
            Novo Cliente
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, CPF ou telefone"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <Select value={ativo} onChange={(e) => setAtivo(e.target.value)} options={OPCOES_ATIVO} />
        <Select
          value={temReceita}
          onChange={(e) => setTemReceita(e.target.value)}
          options={OPCOES_RECEITA}
        />
        <Select value={ordenar} onChange={(e) => setOrdenar(e.target.value)} options={OPCOES_ORDENACAO} />
      </div>

      <TabelaGenerica
        colunas={colunas}
        linhas={dados}
        carregando={carregando}
        onRowClick={(linha) => navigate(`/admin/clientes/${linha.id}`)}
        vazioTitulo="Nenhum cliente encontrado"
        vazioDescricao={
          buscaDebounced
            ? 'Tente ajustar a busca ou os filtros.'
            : 'Cadastre o primeiro cliente para começar.'
        }
      />

      {erro && <p className="mt-3 text-sm text-red-600">Não foi possível carregar os clientes.</p>}

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
              Página {pagina} de {totalPaginas} · {totalRegistros} clientes
            </span>
            <Button
              variant="secondary"
              disabled={pagina <= 1}
              onClick={() => setPagina((p) => p - 1)}
            >
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
