import { useMemo, useState } from 'react'
import { FileDown, CreditCard } from 'lucide-react'
import { PageHeader } from '../../shared/components/PageHeader'
import { Button } from '../../shared/components/Button'
import { Carregando, Vazio } from '../../shared/components/EstadoTela'
import { useSupabaseQuery } from '../../shared/hooks/useSupabaseQuery'
import { useAuth } from '../../shared/hooks/useAuth'
import { criarCobranca } from '../../shared/lib/asaas'
import { gerarPdfOS } from '../../shared/lib/pdf'
import { formatarMoeda, formatarData } from '../../shared/utils/formatters'

const STATUS_LABEL = {
  RECEIVED: 'Pago',
  CONFIRMED: 'Confirmado',
  PENDING: 'Pendente',
  OVERDUE: 'Vencido',
}

export default function Pagamentos() {
  const { perfil } = useAuth()
  const [gerandoId, setGerandoId] = useState(null)
  const [erro, setErro] = useState(null)

  const { dados: ordens, carregando: carregandoOS } = useSupabaseQuery(
    (supabase) =>
      supabase
        .from('ordens_servico')
        .select('*')
        .eq('cliente_id', perfil?.id)
        .not('status', 'in', '(orcamento,cancelado)')
        .order('created_at', { ascending: false }),
    [perfil?.id]
  )

  const {
    dados: pagamentos,
    carregando: carregandoPagamentos,
    refetch: refetchPagamentos,
  } = useSupabaseQuery(
    (supabase) =>
      supabase
        .from('pagamentos')
        .select('*, ordens_servico(numero, clientes(nome, cpf))')
        .order('created_at', { ascending: false }),
    []
  )

  const carregando = carregandoOS || carregandoPagamentos

  const emAberto = useMemo(() => {
    if (!ordens) return []
    return ordens
      .map((os) => ({
        os,
        pagamento: pagamentos?.find((p) => p.os_id === os.id),
      }))
      .filter(({ pagamento }) => !pagamento || ['PENDING', 'OVERDUE'].includes(pagamento.status))
  }, [ordens, pagamentos])

  const historico = useMemo(
    () => (pagamentos ?? []).filter((p) => ['RECEIVED', 'CONFIRMED'].includes(p.status)),
    [pagamentos]
  )

  async function pagar(os) {
    setErro(null)
    setGerandoId(os.id)
    try {
      const resultado = await criarCobranca(os.id)
      refetchPagamentos()
      if (resultado?.invoice_url) {
        window.open(resultado.invoice_url, '_blank')
      }
    } catch {
      setErro('Não foi possível gerar a cobrança. Tente novamente.')
    } finally {
      setGerandoId(null)
    }
  }

  function baixarRecibo(pagamento) {
    gerarPdfOS({
      os: {
        numero: pagamento.ordens_servico?.numero,
        status: 'entregue',
        created_at: pagamento.created_at,
        desconto: 0,
        prazo_entrega: null,
      },
      cliente: pagamento.ordens_servico?.clientes,
      itens: [{ descricao: `Pagamento OS #${pagamento.ordens_servico?.numero}`, quantidade: 1, valor_unitario: Number(pagamento.valor) }],
      loja: null,
    })
  }

  return (
    <div>
      <PageHeader titulo="Pagamentos" />

      {erro && <p className="mb-3 text-sm text-red-600">{erro}</p>}
      {carregando && <Carregando />}

      <h3 className="mb-2 text-sm font-medium text-gray-500">Em aberto</h3>
      {!carregando && emAberto.length === 0 && <Vazio titulo="Nenhuma parcela em aberto" />}
      <div className="mb-6 space-y-2">
        {emAberto.map(({ os, pagamento }) => (
          <div key={os.id} className="rounded-xl border border-gray-100 shadow-soft bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-medium text-gray-900">Pedido #{os.numero}</p>
              <span className="text-sm text-gray-500">
                {pagamento ? STATUS_LABEL[pagamento.status] : 'Aguardando cobrança'}
              </span>
            </div>
            <p className="mb-3 text-lg font-semibold text-gray-900">
              {formatarMoeda(Number(os.valor_total) - Number(os.desconto ?? 0))}
            </p>
            {pagamento?.invoice_url ? (
              <Button className="w-full" onClick={() => window.open(pagamento.invoice_url, '_blank')}>
                <CreditCard size={16} />
                Ir para pagamento
              </Button>
            ) : (
              <Button className="w-full" loading={gerandoId === os.id} onClick={() => pagar(os)}>
                <CreditCard size={16} />
                Gerar cobrança e pagar
              </Button>
            )}
          </div>
        ))}
      </div>

      <h3 className="mb-2 text-sm font-medium text-gray-500">Histórico</h3>
      {!carregando && historico.length === 0 && <Vazio titulo="Nenhum pagamento concluído ainda" />}
      <div className="space-y-2">
        {historico.map((pagamento) => (
          <div
            key={pagamento.id}
            className="flex items-center justify-between rounded-xl border border-gray-100 shadow-soft bg-white p-4"
          >
            <div>
              <p className="font-medium text-gray-900">Pedido #{pagamento.ordens_servico?.numero}</p>
              <p className="text-sm text-gray-500">{formatarData(pagamento.data_pagamento)}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium text-gray-900">{formatarMoeda(pagamento.valor)}</span>
              <button onClick={() => baixarRecibo(pagamento)} className="text-blue-600">
                <FileDown size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
