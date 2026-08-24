import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { FileDown, Ban } from 'lucide-react'
import { PageHeader } from '../../../shared/components/PageHeader'
import { Button } from '../../../shared/components/Button'
import { Badge } from '../../../shared/components/Badge'
import { Modal } from '../../../shared/components/Modal'
import { Input } from '../../../shared/components/Input'
import { Carregando, Erro } from '../../../shared/components/EstadoTela'
import { useSupabaseQuery } from '../../../shared/hooks/useSupabaseQuery'
import { useAuth } from '../../../shared/hooks/useAuth'
import { supabase } from '../../../shared/lib/supabaseClient'
import { formatarMoeda, formatarData, formatarCPF } from '../../../shared/utils/formatters'
import {
  STATUS_OS_LABEL,
  STATUS_OS_COR,
  ORDEM_STATUS_OS,
  proximoStatus,
} from '../../../shared/constants/statusOS'
import { gerarPdfOS } from '../../../shared/lib/pdf'

function estaAtrasada(os) {
  if (!os?.prazo_entrega) return false
  if (['entregue', 'cancelado'].includes(os.status)) return false
  return new Date(os.prazo_entrega) < new Date(new Date().toDateString())
}

export default function DetalheOS() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const [prazoEditavel, setPrazoEditavel] = useState(false)
  const [novoPrazo, setNovoPrazo] = useState('')
  const [modalCancelarAberto, setModalCancelarAberto] = useState(false)
  const [motivoCancelamento, setMotivoCancelamento] = useState('')
  const [processando, setProcessando] = useState(false)
  const [erroAcao, setErroAcao] = useState(null)

  const {
    dados: os,
    carregando: carregandoOS,
    erro: erroOS,
    refetch: refetchOS,
  } = useSupabaseQuery(
    (supabase) => supabase.from('ordens_servico').select('*, clientes(nome, cpf)').eq('id', id).single(),
    [id]
  )

  const { dados: itens, refetch: refetchItens } = useSupabaseQuery(
    (supabase) =>
      supabase.from('os_itens').select('*, produtos(marca, modelo, cor, tipo)').eq('os_id', id),
    [id]
  )

  const { dados: historico, refetch: refetchHistorico } = useSupabaseQuery(
    (supabase) =>
      supabase
        .from('os_status_historico')
        .select('*, funcionarios(nome)')
        .eq('os_id', id)
        .order('created_at', { ascending: true }),
    [id]
  )

  const { dados: receita } = useSupabaseQuery(
    (supabase) =>
      os?.receita_id
        ? supabase.from('receitas').select('*').eq('id', os.receita_id).single()
        : Promise.resolve({ data: null, error: null }),
    [os?.receita_id]
  )

  const { dados: pagamentos } = useSupabaseQuery(
    (supabase) => supabase.from('pagamentos').select('*').eq('os_id', id),
    [id]
  )

  if (carregandoOS) return <Carregando texto="Carregando OS..." />
  if (erroOS || !os) return <Erro mensagem="Ordem de serviço não encontrada." />

  const proximo = proximoStatus(os.status)
  const total = Number(os.valor_total) - Number(os.desconto ?? 0)

  async function avancarStatus() {
    if (!proximo) return
    setProcessando(true)
    setErroAcao(null)
    const { error } = await supabase.rpc('avancar_status_os', {
      p_os_id: id,
      p_novo_status: proximo,
      p_funcionario_id: perfil?.id ?? null,
    })
    setProcessando(false)
    if (error) {
      setErroAcao('Não foi possível avançar o status.')
      return
    }
    refetchOS()
    refetchHistorico()
  }

  async function cancelarOS() {
    if (!motivoCancelamento.trim()) {
      setErroAcao('Informe o motivo do cancelamento.')
      return
    }
    setProcessando(true)
    setErroAcao(null)
    const { error } = await supabase.rpc('avancar_status_os', {
      p_os_id: id,
      p_novo_status: 'cancelado',
      p_funcionario_id: perfil?.id ?? null,
      p_motivo: motivoCancelamento,
    })
    setProcessando(false)
    if (error) {
      setErroAcao('Não foi possível cancelar a OS.')
      return
    }
    setModalCancelarAberto(false)
    refetchOS()
    refetchHistorico()
  }

  async function salvarPrazo() {
    await supabase.from('ordens_servico').update({ prazo_entrega: novoPrazo || null }).eq('id', id)
    setPrazoEditavel(false)
    refetchOS()
  }

  function baixarPdf() {
    gerarPdfOS({
      os,
      cliente: os.clientes,
      itens: (itens ?? []).map((item) => ({
        descricao: [item.produtos?.marca, item.produtos?.modelo, item.produtos?.cor]
          .filter(Boolean)
          .join(' '),
        quantidade: item.quantidade,
        valor_unitario: Number(item.valor_unitario),
      })),
      loja: null,
    })
  }

  return (
    <div>
      <PageHeader
        titulo={
          <span className="flex items-center gap-3">
            OS #{os.numero}
            <Badge className={STATUS_OS_COR[os.status]}>{STATUS_OS_LABEL[os.status]}</Badge>
          </span>
        }
        descricao={
          <Link to={`/admin/clientes/${os.cliente_id}`} className="text-blue-600 hover:underline">
            {os.clientes?.nome} · {formatarCPF(os.clientes?.cpf)}
          </Link>
        }
        acao={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={baixarPdf}>
              <FileDown size={16} />
              Gerar PDF
            </Button>
            {os.status !== 'cancelado' && os.status !== 'entregue' && (
              <Button variant="danger" onClick={() => setModalCancelarAberto(true)}>
                <Ban size={16} />
                Cancelar OS
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-6 rounded-xl border border-gray-100 shadow-soft p-4">
        <h3 className="mb-3 text-sm font-medium text-gray-500">Linha do tempo</h3>
        <div className="flex flex-wrap gap-4">
          {ORDEM_STATUS_OS.map((status) => {
            const evento = historico?.find((h) => h.status_novo === status)
            const alcancado = evento || os.status === status
            return (
              <div key={status} className="flex flex-col items-center text-center">
                <div
                  className={`h-3 w-3 rounded-full ${alcancado ? 'bg-blue-600' : 'bg-gray-200'}`}
                />
                <span className={`mt-1 text-xs ${alcancado ? 'text-gray-900' : 'text-gray-400'}`}>
                  {STATUS_OS_LABEL[status]}
                </span>
                {evento && (
                  <span className="text-[10px] text-gray-400">{formatarData(evento.created_at)}</span>
                )}
              </div>
            )
          })}
        </div>

        {proximo && (
          <div className="mt-4">
            <Button loading={processando} onClick={avancarStatus}>
              Avançar para"{STATUS_OS_LABEL[proximo]}"
            </Button>
          </div>
        )}

        {os.status === 'cancelado' && os.motivo_cancelamento && (
          <p className="mt-3 text-sm text-red-600">Motivo do cancelamento: {os.motivo_cancelamento}</p>
        )}

        {erroAcao && <p className="mt-2 text-sm text-red-600">{erroAcao}</p>}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-100 shadow-soft p-4">
          <h3 className="mb-3 text-sm font-medium text-gray-500">Itens</h3>
          <div className="space-y-2 text-sm">
            {itens?.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span>
                  {[item.produtos?.marca, item.produtos?.modelo, item.produtos?.cor]
                    .filter(Boolean)
                    .join(' ')}{' '}
                  x{item.quantidade}
                </span>
                <span>{formatarMoeda(item.valor_unitario * item.quantidade)}</span>
              </div>
            ))}
          </div>

          {receita && (
            <div className="mt-4 border-t border-gray-100 pt-3 text-sm">
              <p className="text-gray-500">
                Receita: OD {receita.esferico_od ?? '—'}/{receita.cilindrico_od ?? '—'} · OE{' '}
                {receita.esferico_oe ?? '—'}/{receita.cilindrico_oe ?? '—'}
              </p>
              <Link
                to={`/admin/clientes/${os.cliente_id}`}
                className="text-xs text-blue-600 hover:underline"
              >
                Ver receita completa
              </Link>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 shadow-soft p-4">
          <h3 className="mb-3 text-sm font-medium text-gray-500">Financeiro</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Subtotal</dt>
              <dd>{formatarMoeda(os.valor_total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Desconto</dt>
              <dd>{formatarMoeda(os.desconto)}</dd>
            </div>
            <div className="flex justify-between font-medium text-gray-900">
              <dt>Total</dt>
              <dd>{formatarMoeda(total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Forma de pagamento</dt>
              <dd>{os.forma_pagamento ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Status do pagamento (Asaas)</dt>
              <dd>{pagamentos?.[0]?.status ?? 'Sem cobrança gerada'}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-gray-500">Prazo de entrega</dt>
              {prazoEditavel ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={novoPrazo}
                    onChange={(e) => setNovoPrazo(e.target.value)}
                  />
                  <Button onClick={salvarPrazo}>Salvar</Button>
                </div>
              ) : (
                <dd className="flex items-center gap-2">
                  <span className={estaAtrasada(os) ? 'font-medium text-red-600' : ''}>
                    {os.prazo_entrega ? formatarData(os.prazo_entrega) : '—'}
                  </span>
                  <button
                    className="text-xs text-blue-600 hover:underline"
                    onClick={() => {
                      setNovoPrazo(os.prazo_entrega ?? '')
                      setPrazoEditavel(true)
                    }}
                  >
                    editar
                  </button>
                </dd>
              )}
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-100 shadow-soft p-4">
        <h3 className="mb-3 text-sm font-medium text-gray-500">Histórico de alterações</h3>
        <div className="space-y-2 text-sm">
          {historico?.map((evento) => (
            <div key={evento.id} className="flex justify-between text-gray-600">
              <span>
                {evento.status_anterior ? `${STATUS_OS_LABEL[evento.status_anterior]} → ` : ''}
                {STATUS_OS_LABEL[evento.status_novo]}
                {evento.motivo && ` — ${evento.motivo}`}
              </span>
              <span className="text-gray-400">
                {formatarData(evento.created_at)} · {evento.funcionarios?.nome ?? '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Modal
        aberto={modalCancelarAberto}
        onClose={() => setModalCancelarAberto(false)}
        titulo="Cancelar OS"
      >
        <div className="space-y-3">
          <Input
            label="Motivo do cancelamento"
            value={motivoCancelamento}
            onChange={(e) => setMotivoCancelamento(e.target.value)}
          />
          {erroAcao && <p className="text-sm text-red-600">{erroAcao}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalCancelarAberto(false)}>
              Voltar
            </Button>
            <Button variant="danger" loading={processando} onClick={cancelarOS}>
              Confirmar cancelamento
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
