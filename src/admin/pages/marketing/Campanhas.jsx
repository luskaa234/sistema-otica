import { useState } from 'react'
import { Plus, Send } from 'lucide-react'
import { PageHeader } from '../../../shared/components/PageHeader'
import { Button } from '../../../shared/components/Button'
import { Input } from '../../../shared/components/Input'
import { Select } from '../../../shared/components/Select'
import { Modal } from '../../../shared/components/Modal'
import { Badge } from '../../../shared/components/Badge'
import { Carregando, Vazio } from '../../../shared/components/EstadoTela'
import { useSupabaseQuery } from '../../../shared/hooks/useSupabaseQuery'
import { supabase } from '../../../shared/lib/supabaseClient'
import { enviarCampanha } from '../../../shared/lib/marketing'
import { formatarData } from '../../../shared/utils/formatters'

const OPCOES_SEGMENTO = [
  { value: 'todos', label: 'Todos os clientes' },
  { value: 'inativos', label: 'Inativos há X meses' },
  { value: 'receita_vencida', label: 'Receita vencida (> 1 ano)' },
  { value: 'manual', label: 'Seleção manual' },
]

const OPCOES_CANAL = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'E-mail' },
]

const STATUS_LABEL = {
  rascunho: 'Rascunho',
  agendada: 'Agendada',
  enviada: 'Enviada',
  erro: 'Erro',
}

const STATUS_COR = {
  rascunho: 'bg-gray-100 text-gray-700',
  agendada: 'bg-amber-100 text-amber-700',
  enviada: 'bg-green-100 text-green-700',
  erro: 'bg-red-100 text-red-700',
}

export default function Campanhas() {
  const [modalAberto, setModalAberto] = useState(false)
  const [disparandoId, setDisparandoId] = useState(null)
  const [erroDisparo, setErroDisparo] = useState(null)

  const { dados: campanhas, carregando, refetch } = useSupabaseQuery(
    (supabase) => supabase.from('campanhas_marketing').select('*').order('created_at', { ascending: false }),
    []
  )

  async function disparar(campanha) {
    setErroDisparo(null)
    setDisparandoId(campanha.id)
    try {
      await enviarCampanha(campanha.id)
      refetch()
    } catch {
      setErroDisparo('Não foi possível disparar a campanha.')
    } finally {
      setDisparandoId(null)
    }
  }

  return (
    <div>
      <PageHeader
        titulo="Campanhas de Marketing"
        descricao="Segmentação de clientes e disparo por WhatsApp ou e-mail"
        acao={
          <Button onClick={() => setModalAberto(true)}>
            <Plus size={16} />
            Nova Campanha
          </Button>
        }
      />

      {erroDisparo && <p className="mb-3 text-sm text-red-600">{erroDisparo}</p>}

      {carregando && <Carregando />}
      {!carregando && (!campanhas || campanhas.length === 0) && (
        <Vazio titulo="Nenhuma campanha criada ainda" />
      )}

      <div className="space-y-2">
        {campanhas?.map((campanha) => (
          <div
            key={campanha.id}
            className="flex items-center justify-between rounded-xl border border-gray-100 shadow-soft p-3 text-sm"
          >
            <div>
              <p className="font-medium text-gray-900">{campanha.nome}</p>
              <p className="text-gray-500">
                {OPCOES_CANAL.find((c) => c.value === campanha.canal)?.label} ·{' '}
                {campanha.data_envio ? formatarData(campanha.data_envio) : 'Sem data'}
                {campanha.destinatarios_total != null &&
                  ` · ${campanha.destinatarios_sucesso ?? 0}/${campanha.destinatarios_total} enviados`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={STATUS_COR[campanha.status]}>{STATUS_LABEL[campanha.status]}</Badge>
              {campanha.status !== 'enviada' && (
                <Button
                  variant="secondary"
                  loading={disparandoId === campanha.id}
                  onClick={() => disparar(campanha)}
                >
                  <Send size={14} />
                  Disparar agora
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal aberto={modalAberto} onClose={() => setModalAberto(false)} titulo="Nova Campanha">
        <FormularioCampanha
          onSalvo={() => {
            setModalAberto(false)
            refetch()
          }}
          onCancelar={() => setModalAberto(false)}
        />
      </Modal>
    </div>
  )
}

function FormularioCampanha({ onSalvo, onCancelar }) {
  const [nome, setNome] = useState('')
  const [segmento, setSegmento] = useState('todos')
  const [inatividadeMeses, setInatividadeMeses] = useState('6')
  const [buscaCliente, setBuscaCliente] = useState('')
  const [resultadosClientes, setResultadosClientes] = useState([])
  const [clientesSelecionados, setClientesSelecionados] = useState([])
  const [canal, setCanal] = useState('whatsapp')
  const [mensagem, setMensagem] = useState('')
  const [modoEnvio, setModoEnvio] = useState('agora')
  const [dataProgramada, setDataProgramada] = useState('')
  const [previa, setPrevia] = useState(null)
  const [carregandoPrevia, setCarregandoPrevia] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)
  const [confirmando, setConfirmando] = useState(false)

  async function buscarClientes(termo) {
    setBuscaCliente(termo)
    if (termo.trim().length < 2) {
      setResultadosClientes([])
      return
    }
    const { data } = await supabase.from('clientes').select('id, nome').ilike('nome', `%${termo}%`).limit(10)
    setResultadosClientes(data ?? [])
  }

  function adicionarCliente(cliente) {
    if (!clientesSelecionados.some((c) => c.id === cliente.id)) {
      setClientesSelecionados((atual) => [...atual, cliente])
    }
    setBuscaCliente('')
    setResultadosClientes([])
  }

  async function calcularPrevia() {
    setCarregandoPrevia(true)
    const { data } = await supabase.rpc('calcular_destinatarios_campanha', {
      p_segmento: segmento,
      p_inatividade_meses: segmento === 'inativos' ? Number(inatividadeMeses) : null,
      p_clientes_selecionados: segmento === 'manual' ? clientesSelecionados.map((c) => c.id) : null,
    })
    setPrevia(data ?? [])
    setCarregandoPrevia(false)
    setConfirmando(true)
  }

  async function confirmarEnvio() {
    setErro(null)
    if (!nome.trim() || !mensagem.trim()) {
      setErro('Preencha nome e mensagem.')
      return
    }
    setSalvando(true)

    const payload = {
      nome,
      canal,
      mensagem,
      segmento,
      inatividade_meses: segmento === 'inativos' ? Number(inatividadeMeses) : null,
      clientes_selecionados: segmento === 'manual' ? clientesSelecionados.map((c) => c.id) : null,
      status: modoEnvio === 'agora' ? 'rascunho' : 'agendada',
      data_envio: modoEnvio === 'programado' ? dataProgramada : null,
    }

    const { data, error } = await supabase.from('campanhas_marketing').insert(payload).select('id').single()

    if (error) {
      setErro('Não foi possível salvar a campanha.')
      setSalvando(false)
      return
    }

    if (modoEnvio === 'agora') {
      try {
        await enviarCampanha(data.id)
      } catch {
        setErro('Campanha criada, mas o disparo falhou. Tente disparar novamente na lista.')
      }
    }

    setSalvando(false)
    onSalvo()
  }

  const mensagemPreview = mensagem
    .replaceAll('{nome_cliente}', 'Maria Silva')
    .replaceAll('{ultima_compra}', '10/03/2026')

  if (confirmando) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-700">
          Esta campanha será enviada para <span className="font-medium">{previa?.length ?? 0}</span>{' '}
          cliente(s) via {OPCOES_CANAL.find((c) => c.value === canal)?.label}.
        </p>
        <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-100 p-2 text-xs text-gray-500">
          {previa?.slice(0, 20).map((p) => (
            <p key={p.cliente_id}>{p.nome}</p>
          ))}
          {previa && previa.length > 20 && <p>...e mais {previa.length - 20}</p>}
        </div>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmando(false)}>
            Voltar
          </Button>
          <Button loading={salvando} onClick={confirmarEnvio}>
            {modoEnvio === 'agora' ? 'Confirmar e enviar' : 'Confirmar agendamento'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Input label="Nome da campanha" value={nome} onChange={(e) => setNome(e.target.value)} />

      <Select label="Segmento" value={segmento} onChange={(e) => setSegmento(e.target.value)} options={OPCOES_SEGMENTO} />

      {segmento === 'inativos' && (
        <Input
          label="Inatividade (meses)"
          type="number"
          value={inatividadeMeses}
          onChange={(e) => setInatividadeMeses(e.target.value)}
        />
      )}

      {segmento === 'manual' && (
        <div>
          <input
            value={buscaCliente}
            onChange={(e) => buscarClientes(e.target.value)}
            placeholder="Buscar cliente por nome"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          {resultadosClientes.length > 0 && (
            <div className="mt-1 divide-y divide-gray-100 rounded-xl border border-gray-100 shadow-soft">
              {resultadosClientes.map((cliente) => (
                <button
                  key={cliente.id}
                  onClick={() => adicionarCliente(cliente)}
                  className="block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                >
                  {cliente.nome}
                </button>
              ))}
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-1">
            {clientesSelecionados.map((c) => (
              <span key={c.id} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                {c.nome}
              </span>
            ))}
          </div>
        </div>
      )}

      <Select label="Canal" value={canal} onChange={(e) => setCanal(e.target.value)} options={OPCOES_CANAL} />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Mensagem</label>
        <textarea
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          rows={4}
          placeholder="Olá {nome_cliente}, faz tempo desde sua última visita ({ultima_compra})..."
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <p className="text-xs text-gray-400">Variáveis: {'{nome_cliente}'}, {'{ultima_compra}'}</p>
      </div>

      {mensagem && (
        <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
          <p className="mb-1 font-medium text-gray-500">Prévia:</p>
          {mensagemPreview}
        </div>
      )}

      <Select
        label="Envio"
        value={modoEnvio}
        onChange={(e) => setModoEnvio(e.target.value)}
        options={[
          { value: 'agora', label: 'Enviar agora' },
          { value: 'programado', label: 'Programar data/hora' },
        ]}
      />

      {modoEnvio === 'programado' && (
        <Input
          label="Data e hora"
          type="datetime-local"
          value={dataProgramada}
          onChange={(e) => setDataProgramada(e.target.value)}
        />
      )}

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button loading={carregandoPrevia} onClick={calcularPrevia}>
          Ver destinatários
        </Button>
      </div>
    </div>
  )
}
