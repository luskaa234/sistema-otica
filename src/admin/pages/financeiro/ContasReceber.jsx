import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../../shared/components/PageHeader'
import { Button } from '../../../shared/components/Button'
import { Select } from '../../../shared/components/Select'
import { Badge } from '../../../shared/components/Badge'
import { Modal } from '../../../shared/components/Modal'
import { Carregando, Vazio } from '../../../shared/components/EstadoTela'
import { useSupabaseQuery } from '../../../shared/hooks/useSupabaseQuery'
import { supabase } from '../../../shared/lib/supabaseClient'
import { formatarMoeda, formatarData } from '../../../shared/utils/formatters'

const STATUS_COR = {
  RECEIVED: 'bg-green-100 text-green-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  PENDING: 'bg-amber-100 text-amber-700',
  OVERDUE: 'bg-red-100 text-red-700',
  DELETED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-gray-100 text-gray-700',
}

const STATUS_LABEL = {
  RECEIVED: 'Pago',
  CONFIRMED: 'Confirmado',
  PENDING: 'Pendente',
  OVERDUE: 'Vencido',
  DELETED: 'Cancelado',
  REFUNDED: 'Reembolsado',
}

const OPCOES_STATUS = [
  { value: '', label: 'Todos os status' },
  ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })),
]

export default function ContasReceber() {
  const [status, setStatus] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [pagamentoSelecionado, setPagamentoSelecionado] = useState(null)

  const { dados: pagamentos, carregando, refetch } = useSupabaseQuery(
    (supabase) => {
      let query = supabase
        .from('pagamentos')
        .select('*, ordens_servico(numero, cliente_id, clientes(nome))')
        .order('created_at', { ascending: false })

      if (status) query = query.eq('status', status)
      if (dataInicio) query = query.gte('created_at', dataInicio)
      if (dataFim) query = query.lte('created_at', `${dataFim}T23:59:59`)

      return query
    },
    [status, dataInicio, dataFim]
  )

  async function marcarLembreteEnviado(pagamento) {
    await supabase
      .from('pagamentos')
      .update({ lembrete_enviado_em: new Date().toISOString() })
      .eq('id', pagamento.id)
    refetch()
    setPagamentoSelecionado((atual) =>
      atual?.id === pagamento.id ? { ...atual, lembrete_enviado_em: new Date().toISOString() } : atual
    )
  }

  return (
    <div>
      <PageHeader titulo="Contas a Receber" descricao="Pagamentos vinculados a OS, espelhando o status da Asaas" />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} options={OPCOES_STATUS} />
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

      {carregando && <Carregando />}
      {!carregando && (!pagamentos || pagamentos.length === 0) && (
        <Vazio
          titulo="Nenhum pagamento encontrado"
          descricao="Pagamentos aparecem aqui quando uma cobrança Asaas é gerada numa OS."
        />
      )}

      <div className="space-y-2">
        {pagamentos?.map((pagamento) => (
          <button
            key={pagamento.id}
            onClick={() => setPagamentoSelecionado(pagamento)}
            className="flex w-full items-center justify-between rounded-xl border border-gray-100 shadow-soft p-3 text-left text-sm hover:bg-gray-50"
          >
            <div>
              <p className="font-medium text-gray-900">
                {pagamento.ordens_servico?.clientes?.nome} · OS #{pagamento.ordens_servico?.numero}
              </p>
              <p className="text-gray-500">{formatarData(pagamento.created_at)}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium text-gray-900">{formatarMoeda(pagamento.valor)}</span>
              <Badge className={STATUS_COR[pagamento.status] ?? 'bg-gray-100 text-gray-700'}>
                {STATUS_LABEL[pagamento.status] ?? pagamento.status}
              </Badge>
            </div>
          </button>
        ))}
      </div>

      <Modal
        aberto={Boolean(pagamentoSelecionado)}
        onClose={() => setPagamentoSelecionado(null)}
        titulo="Detalhe do pagamento"
      >
        {pagamentoSelecionado && (
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-gray-500">Cliente:</span>{' '}
              <Link
                to={`/admin/clientes/${pagamentoSelecionado.ordens_servico?.cliente_id}`}
                className="text-blue-600 hover:underline"
              >
                {pagamentoSelecionado.ordens_servico?.clientes?.nome}
              </Link>
            </p>
            <p>
              <span className="text-gray-500">OS:</span>{' '}
              <Link
                to={`/admin/vendas/${pagamentoSelecionado.os_id}`}
                className="text-blue-600 hover:underline"
              >
                #{pagamentoSelecionado.ordens_servico?.numero}
              </Link>
            </p>
            <p>
              <span className="text-gray-500">Valor:</span> {formatarMoeda(pagamentoSelecionado.valor)}
            </p>
            <p>
              <span className="text-gray-500">Status:</span>{' '}
              {STATUS_LABEL[pagamentoSelecionado.status] ?? pagamentoSelecionado.status}
            </p>
            {pagamentoSelecionado.invoice_url && (
              <p>
                <a
                  href={pagamentoSelecionado.invoice_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Ver comprovante na Asaas
                </a>
              </p>
            )}

            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="mb-2 text-xs font-medium text-gray-500">Régua de cobrança</p>
              {pagamentoSelecionado.lembrete_enviado_em ? (
                <p className="text-xs text-gray-500">
                  Lembrete enviado em {formatarData(pagamentoSelecionado.lembrete_enviado_em)}
                </p>
              ) : (
                <Button variant="secondary" onClick={() => marcarLembreteEnviado(pagamentoSelecionado)}>
                  Marcar lembrete como enviado
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
