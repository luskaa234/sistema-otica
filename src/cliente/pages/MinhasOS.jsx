import { PageHeader } from '../../shared/components/PageHeader'
import { Carregando, Vazio } from '../../shared/components/EstadoTela'
import { useSupabaseQuery } from '../../shared/hooks/useSupabaseQuery'
import { useAuth } from '../../shared/hooks/useAuth'
import { formatarMoeda, formatarData } from '../../shared/utils/formatters'
import { ORDEM_STATUS_OS, STATUS_OS_LABEL } from '../../shared/constants/statusOS'

export default function MinhasOS() {
  const { perfil } = useAuth()

  const { dados: ordens, carregando } = useSupabaseQuery(
    (supabase) =>
      supabase
        .from('ordens_servico')
        .select('*')
        .eq('cliente_id', perfil?.id)
        .order('created_at', { ascending: false }),
    [perfil?.id]
  )

  return (
    <div>
      <PageHeader titulo="Meus Pedidos" />

      {carregando && <Carregando />}
      {!carregando && (!ordens || ordens.length === 0) && <Vazio titulo="Nenhum pedido ainda" />}

      <div className="space-y-3">
        {ordens?.map((os) => (
          <div key={os.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-medium text-gray-900">Pedido #{os.numero}</p>
              <p className="text-sm text-gray-500">{formatarData(os.created_at)}</p>
            </div>

            {os.status === 'cancelado' ? (
              <p className="text-sm font-medium text-red-600">Cancelado</p>
            ) : (
              <div className="flex items-center gap-1">
                {ORDEM_STATUS_OS.map((status, indice) => {
                  const indiceAtual = ORDEM_STATUS_OS.indexOf(os.status)
                  const alcancado = indice <= indiceAtual
                  return (
                    <div key={status} className="flex flex-1 flex-col items-center">
                      <div
                        className={`h-2 w-full rounded-full ${alcancado ? 'bg-blue-600' : 'bg-gray-200'}`}
                      />
                      <span
                        className={`mt-1 text-center text-[10px] ${alcancado ? 'text-gray-900' : 'text-gray-400'}`}
                      >
                        {STATUS_OS_LABEL[status]}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            <p className="mt-3 text-right font-medium text-gray-900">
              {formatarMoeda(Number(os.valor_total) - Number(os.desconto ?? 0))}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
