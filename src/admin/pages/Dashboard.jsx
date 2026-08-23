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
      <PageHeader
        titulo="Dashboard"
        descricao="Visão geral da loja"
      />

      {carregando && <Carregando texto="Carregando indicadores..." />}
      {erro && <Erro mensagem="Não foi possível carregar os indicadores." />}

      {!carregando && !erro && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <CardIndicador titulo="Clientes cadastrados" valor={clientes.dados?.length ?? 0} />
          <CardIndicador titulo="Ordens de serviço" valor={os.dados?.length ?? 0} />
          <CardIndicador
            titulo="Pagamentos pendentes"
            valor={pagamentosPendentes.dados?.length ?? 0}
          />
        </div>
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
