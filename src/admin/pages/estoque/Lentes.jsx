import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../../shared/components/PageHeader'
import { Button } from '../../../shared/components/Button'
import { Badge } from '../../../shared/components/Badge'
import { Carregando, Vazio } from '../../../shared/components/EstadoTela'
import { useSupabaseQuery } from '../../../shared/hooks/useSupabaseQuery'
import { supabase } from '../../../shared/lib/supabaseClient'
import { formatarData } from '../../../shared/utils/formatters'

const STATUS_LABEL = {
  pedido_enviado: 'Pedido enviado',
  em_producao: 'Em produção no laboratório',
  recebido: 'Recebido na loja',
}

const STATUS_COR = {
  pedido_enviado: 'bg-gray-100 text-gray-700',
  em_producao: 'bg-amber-100 text-amber-700',
  recebido: 'bg-green-100 text-green-700',
}

const PROXIMO_STATUS = {
  pedido_enviado: 'em_producao',
  em_producao: 'recebido',
}

function estaAtrasado(pedido) {
  if (!pedido.prazo_estimado || pedido.status === 'recebido') return false
  return new Date(pedido.prazo_estimado) < new Date(new Date().toDateString())
}

export default function Lentes() {
  const [processandoId, setProcessandoId] = useState(null)

  const { dados: pedidos, carregando, refetch } = useSupabaseQuery(
    (supabase) =>
      supabase
        .from('pedidos_lente')
        .select('*, produtos(marca, modelo), fornecedores(nome), ordens_servico(numero, cliente_id)')
        .order('created_at', { ascending: false }),
    []
  )

  const emAndamento = pedidos?.filter((p) => p.status !== 'recebido') ?? []
  const recebidos = pedidos?.filter((p) => p.status === 'recebido') ?? []

  async function avancar(pedido) {
    const proximo = PROXIMO_STATUS[pedido.status]
    if (!proximo) return

    setProcessandoId(pedido.id)
    await supabase
      .from('pedidos_lente')
      .update({
        status: proximo,
        data_recebimento: proximo === 'recebido' ? new Date().toISOString().slice(0, 10) : null,
      })
      .eq('id', pedido.id)
    setProcessandoId(null)
    refetch()
  }

  return (
    <div>
      <PageHeader
        titulo="Lentes"
        descricao="Pedidos de lente em andamento (gerados automaticamente ao aprovar uma OS)"
      />

      {carregando && <Carregando />}

      {!carregando && emAndamento.length === 0 && (
        <Vazio
          titulo="Nenhum pedido de lente em andamento"
          descricao="Pedidos aparecem aqui automaticamente quando uma OS com lente é aprovada."
        />
      )}

      <div className="space-y-2">
        {emAndamento.map((pedido) => (
          <div
            key={pedido.id}
            className="flex items-center justify-between rounded-xl border border-gray-100 shadow-soft p-3 text-sm"
          >
            <div>
              <p className="font-medium text-gray-900">
                {[pedido.produtos?.marca, pedido.produtos?.modelo].filter(Boolean).join(' ')}
              </p>
              <p className="text-gray-500">
                Fornecedor: {pedido.fornecedores?.nome ?? '—'} ·{' '}
                <Link to={`/admin/vendas/${pedido.os_id}`} className="text-blue-600 hover:underline">
                  OS #{pedido.ordens_servico?.numero}
                </Link>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className={estaAtrasado(pedido) ? 'font-medium text-red-600' : 'text-gray-500'}>
                Prazo: {pedido.prazo_estimado ? formatarData(pedido.prazo_estimado) : '—'}
              </span>
              <Badge className={STATUS_COR[pedido.status]}>{STATUS_LABEL[pedido.status]}</Badge>
              {PROXIMO_STATUS[pedido.status] && (
                <Button
                  variant="secondary"
                  loading={processandoId === pedido.id}
                  onClick={() => avancar(pedido)}
                >
                  Avançar
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {recebidos.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-2 text-sm font-medium text-gray-500">Histórico de lentes recebidas</h3>
          <div className="space-y-2">
            {recebidos.map((pedido) => (
              <div
                key={pedido.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 p-3 text-sm text-gray-500"
              >
                <span>
                  {[pedido.produtos?.marca, pedido.produtos?.modelo].filter(Boolean).join(' ')} · OS #
                  {pedido.ordens_servico?.numero}
                </span>
                <span>Recebido em {formatarData(pedido.data_recebimento)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
