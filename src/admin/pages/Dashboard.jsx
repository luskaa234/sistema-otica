import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import {
  CircleDollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Wallet,
  ReceiptText,
  PackageX,
  AlertTriangle,
  Clock,
  Glasses,
  Package,
  Plus,
  UserPlus,
  PackagePlus,
} from 'lucide-react'
import { PageHeader } from '../../shared/components/PageHeader'
import { Button } from '../../shared/components/Button'
import { Carregando, Erro, Vazio } from '../../shared/components/EstadoTela'
import { useSupabaseQuery } from '../../shared/hooks/useSupabaseQuery'
import { formatarMoeda, formatarData } from '../../shared/utils/formatters'
import { ACAO_AUDITORIA_LABEL } from '../../shared/constants/auditoria'

const COR_PRINCIPAL = '#2563eb'

const TIPO_ACAO_ICONE = {
  os_atrasada: Clock,
  pagamento_vencido: CircleDollarSign,
  lente_atrasada: Glasses,
  estoque_zerado: PackageX,
}

function inicioMesISO() {
  return new Date().toISOString().slice(0, 8) + '01'
}

function diasAtrasISO(dias) {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return d.toISOString().slice(0, 10)
}

export default function Dashboard() {
  const { dados: indicadores, carregando: carregandoIndicadores, erro } = useSupabaseQuery(
    (supabase) => supabase.rpc('dashboard_indicadores').single(),
    []
  )

  const { dados: acaoNecessaria, carregando: carregandoAcao } = useSupabaseQuery(
    (supabase) => supabase.rpc('dashboard_acao_necessaria'),
    []
  )

  const { dados: vendas30Dias, carregando: carregandoVendas30 } = useSupabaseQuery(
    (supabase) =>
      supabase
        .from('ordens_servico')
        .select('created_at, valor_total, desconto, status')
        .not('status', 'in', '(orcamento,cancelado)')
        .gte('created_at', diasAtrasISO(30)),
    []
  )

  const { dados: vendedoresMes, carregando: carregandoVendedores } = useSupabaseQuery(
    (supabase) =>
      supabase.rpc('vendas_por_vendedor', {
        p_data_inicio: inicioMesISO(),
        p_data_fim: new Date().toISOString().slice(0, 10),
      }),
    []
  )

  const { dados: topProdutosMes, carregando: carregandoProdutos } = useSupabaseQuery(
    (supabase) =>
      supabase.rpc('produtos_mais_vendidos', {
        p_data_inicio: inicioMesISO(),
        p_data_fim: new Date().toISOString().slice(0, 10),
        p_limit: 5,
      }),
    []
  )

  const { dados: feedAtividade, carregando: carregandoFeed } = useSupabaseQuery(
    (supabase) =>
      supabase
        .from('logs_auditoria')
        .select('*, funcionarios(nome)')
        .order('created_at', { ascending: false })
        .limit(10),
    []
  )

  const dadosGraficoVendas = useMemo(() => {
    const grupos = {}
    for (const os of vendas30Dias ?? []) {
      const dia = os.created_at.slice(0, 10)
      grupos[dia] ??= { dia, valor: 0 }
      grupos[dia].valor += Number(os.valor_total) - Number(os.desconto ?? 0)
    }
    return Object.values(grupos).sort((a, b) => a.dia.localeCompare(b.dia))
  }, [vendas30Dias])

  const carregandoGeral =
    carregandoIndicadores || carregandoAcao || carregandoVendas30 || carregandoVendedores || carregandoProdutos

  const variacaoMensal =
    indicadores && Number(indicadores.vendas_mes_anterior_valor) > 0
      ? Math.round(
          ((Number(indicadores.vendas_mes_valor) - Number(indicadores.vendas_mes_anterior_valor)) /
            Number(indicadores.vendas_mes_anterior_valor)) *
            1000
        ) / 10
      : null

  return (
    <div>
      <PageHeader
        titulo="Dashboard"
        descricao="Visão geral da loja"
        acao={
          <div className="flex gap-2">
            <Button size="sm" as={Link} to="/admin/vendas/novo">
              <Plus size={14} />
              Novo Orçamento
            </Button>
            <Button size="sm" variant="secondary" as={Link} to="/admin/clientes/novo">
              <UserPlus size={14} />
              Novo Cliente
            </Button>
            <Button size="sm" variant="secondary" as={Link} to="/admin/estoque">
              <PackagePlus size={14} />
              Movimentar Estoque
            </Button>
          </div>
        }
      />

      {erro && <Erro mensagem="Não foi possível carregar os indicadores." />}
      {carregandoGeral && <Carregando texto="Carregando indicadores..." />}

      {!carregandoGeral && !erro && indicadores && (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <CardIndicador
              titulo="Vendas do dia"
              valor={formatarMoeda(indicadores.vendas_dia_valor)}
              subtitulo={`${indicadores.vendas_dia_qtd} OS fechada(s)`}
              icon={CircleDollarSign}
              cor="bg-blue-50 text-blue-600"
            />
            <CardIndicador
              titulo="Vendas do mês"
              valor={formatarMoeda(indicadores.vendas_mes_valor)}
              subtitulo={
                variacaoMensal === null ? (
                  'Sem comparativo'
                ) : (
                  <span className={`inline-flex items-center gap-1 ${variacaoMensal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {variacaoMensal >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    {variacaoMensal >= 0 ? '+' : ''}
                    {variacaoMensal}% vs mês anterior
                  </span>
                )
              }
              icon={Wallet}
              cor="bg-violet-50 text-violet-600"
            />
            <CardIndicador
              titulo="OS em aberto"
              valor={indicadores.os_orcamento + indicadores.os_em_producao + indicadores.os_pronto}
              subtitulo={`${indicadores.os_orcamento} orçamento · ${indicadores.os_em_producao} produção · ${indicadores.os_pronto} pronto`}
              icon={ShoppingCart}
              cor="bg-amber-50 text-amber-600"
            />
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <CardIndicador
              titulo="A receber em 7 dias"
              valor={formatarMoeda(indicadores.contas_receber_7dias)}
              icon={ReceiptText}
              cor="bg-green-50 text-green-600"
            />
            <CardIndicador
              titulo="A pagar em 7 dias"
              valor={formatarMoeda(indicadores.contas_pagar_7dias)}
              icon={Wallet}
              cor="bg-red-50 text-red-600"
            />
            <CardIndicador
              titulo="Estoque baixo"
              valor={indicadores.estoque_baixo_qtd}
              subtitulo="itens abaixo do mínimo"
              icon={PackageX}
              cor="bg-orange-50 text-orange-600"
            />
          </div>

          <div className="mb-8 rounded-xl border border-gray-100 bg-white p-5 shadow-soft">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
              <AlertTriangle size={16} className="text-amber-500" />
              Ação necessária
            </h3>
            {(!acaoNecessaria || acaoNecessaria.length === 0) && (
              <Vazio titulo="Tudo em dia" descricao="Nenhuma pendência urgente no momento." />
            )}
            <div className="space-y-1">
              {acaoNecessaria?.map((item, indice) => {
                const Icon = TIPO_ACAO_ICONE[item.tipo] ?? AlertTriangle
                const linkPorTipo = {
                  os_atrasada: `/admin/vendas/${item.referencia_id}`,
                  lente_atrasada: '/admin/estoque/lentes',
                  pagamento_vencido: '/admin/financeiro',
                  estoque_zerado: '/admin/estoque',
                }
                return (
                  <Link
                    key={`${item.tipo}-${indice}`}
                    to={linkPorTipo[item.tipo] ?? '/admin'}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-gray-50"
                  >
                    <span className="flex items-center gap-2">
                      <Icon size={15} className="text-gray-400" />
                      <span className="font-medium text-gray-800">{item.titulo}</span>
                      {item.subtitulo && <span className="text-gray-400">· {item.subtitulo}</span>}
                    </span>
                    {item.data && <span className="text-xs text-gray-400">{formatarData(item.data)}</span>}
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-soft">
              <h3 className="mb-3 text-sm font-semibold text-gray-800">Vendas dos últimos 30 dias</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dadosGraficoVendas}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="dia" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v) => formatarMoeda(v)} width={80} />
                    <Tooltip formatter={(valor) => formatarMoeda(valor)} />
                    <Line type="monotone" dataKey="valor" name="Vendido" stroke={COR_PRINCIPAL} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-soft">
              <h3 className="mb-3 text-sm font-semibold text-gray-800">Vendas por vendedor (mês atual)</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vendedoresMes ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="nome" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v) => formatarMoeda(v)} width={80} />
                    <Tooltip formatter={(valor) => formatarMoeda(valor)} />
                    <Bar dataKey="valor_total" name="Vendido" fill={COR_PRINCIPAL} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-soft">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
                <Package size={15} className="text-gray-400" />
                Top 5 produtos do mês
              </h3>
              {(!topProdutosMes || topProdutosMes.length === 0) && (
                <p className="py-6 text-center text-sm text-gray-400">Nenhuma venda registrada no mês.</p>
              )}
              <div className="space-y-2">
                {topProdutosMes?.map((produto, indice) => (
                  <div key={produto.produto_id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
                        {indice + 1}
                      </span>
                      {produto.marca} {produto.modelo}
                    </span>
                    <span className="text-gray-500">{produto.quantidade_vendida}x</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-soft">
              <h3 className="mb-3 text-sm font-semibold text-gray-800">Atividade recente</h3>
              {carregandoFeed && <Carregando />}
              {!carregandoFeed && (!feedAtividade || feedAtividade.length === 0) && (
                <p className="py-6 text-center text-sm text-gray-400">Nenhuma atividade registrada ainda.</p>
              )}
              <div className="space-y-2 text-sm">
                {feedAtividade?.map((log) => {
                  const linkPorTabela = {
                    ordens_servico: `/admin/vendas/${log.registro_id}`,
                    clientes: `/admin/clientes/${log.registro_id}`,
                  }
                  const link = linkPorTabela[log.tabela_afetada]
                  const conteudo = (
                    <span className="text-gray-700">
                      <span className="font-medium text-gray-900">{log.funcionarios?.nome ?? 'Sistema'}</span>{' '}
                      {(ACAO_AUDITORIA_LABEL[log.acao] ?? log.acao).toLowerCase()}
                    </span>
                  )
                  return (
                    <div key={log.id} className="flex items-center justify-between">
                      {link ? (
                        <Link to={link} className="hover:underline">
                          {conteudo}
                        </Link>
                      ) : (
                        conteudo
                      )}
                      <span className="text-xs text-gray-400">{formatarData(log.created_at)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function CardIndicador({ titulo, valor, subtitulo, icon: Icon, cor }) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-soft transition-shadow hover:shadow-card">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${cor}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{titulo}</p>
        <p className="mt-0.5 text-2xl font-bold tracking-tight text-gray-900">{valor}</p>
        {subtitulo && <p className="mt-0.5 text-xs text-gray-400">{subtitulo}</p>}
      </div>
    </div>
  )
}
