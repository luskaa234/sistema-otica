import { Users, ShoppingCart, CircleDollarSign } from 'lucide-react'
import { PageHeader } from '../../shared/components/PageHeader'
import { useSupabaseQuery } from '../../shared/hooks/useSupabaseQuery'
import { Carregando, Erro } from '../../shared/components/EstadoTela'

function useContagem(tabela) {
  return useSupabaseQuery((supabase) => supabase.from(tabela).select('id'), [tabela])
}

export default function Dashboard() {
  const clientes = useContagem('clientes')
  const os = useContagem('ordens_servico')
  const pagamentosPendentes = useSupabaseQuery(
    (supabase) => supabase.from('pagamentos').select('id').neq('status', 'RECEIVED'),
    []
  )

  const carregando = clientes.carregando || os.carregando || pagamentosPendentes.carregando
  const erro = clientes.erro || os.erro || pagamentosPendentes.erro

  return (
    <div>
      <PageHeader titulo="Dashboard" descricao="Visão geral da loja" />

      {carregando && <Carregando texto="Carregando indicadores..." />}
      {erro && <Erro mensagem="Não foi possível carregar os indicadores." />}

      {!carregando && !erro && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <CardIndicador
            titulo="Clientes cadastrados"
            valor={clientes.dados?.length ?? 0}
            icon={Users}
            cor="bg-blue-50 text-blue-600"
          />
          <CardIndicador
            titulo="Ordens de serviço"
            valor={os.dados?.length ?? 0}
            icon={ShoppingCart}
            cor="bg-violet-50 text-violet-600"
          />
          <CardIndicador
            titulo="Pagamentos pendentes"
            valor={pagamentosPendentes.dados?.length ?? 0}
            icon={CircleDollarSign}
            cor="bg-amber-50 text-amber-600"
          />
        </div>
      )}
    </div>
  )
}

function CardIndicador({ titulo, valor, icon: Icon, cor }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-soft transition-shadow hover:shadow-card">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${cor}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{titulo}</p>
        <p className="mt-0.5 text-2xl font-bold tracking-tight text-gray-900">{valor}</p>
      </div>
    </div>
  )
}
