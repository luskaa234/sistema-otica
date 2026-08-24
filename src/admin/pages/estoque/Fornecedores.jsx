import { useState } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader } from '../../../shared/components/PageHeader'
import { Button } from '../../../shared/components/Button'
import { Input } from '../../../shared/components/Input'
import { Select } from '../../../shared/components/Select'
import { Modal } from '../../../shared/components/Modal'
import { Carregando, Vazio } from '../../../shared/components/EstadoTela'
import { useSupabaseQuery } from '../../../shared/hooks/useSupabaseQuery'
import { supabase } from '../../../shared/lib/supabaseClient'
import { formatarData, formatarTelefone } from '../../../shared/utils/formatters'

const OPCOES_TIPO = [
  { value: 'armacao', label: 'Armação' },
  { value: 'lente', label: 'Lente' },
  { value: 'ambos', label: 'Ambos' },
]

const LABEL_TIPO = {
  armacao: 'Armação',
  lente: 'Lente',
  ambos: 'Armação e lente',
}

export default function Fornecedores() {
  const [modalAberto, setModalAberto] = useState(false)
  const [fornecedorEditando, setFornecedorEditando] = useState(null)
  const [fornecedorExpandidoId, setFornecedorExpandidoId] = useState(null)

  const { dados: fornecedores, carregando, refetch } = useSupabaseQuery(
    (supabase) => supabase.from('fornecedores').select('*').order('nome'),
    []
  )

  return (
    <div>
      <PageHeader
        titulo="Fornecedores"
        descricao="Cadastro e histórico de pedidos por fornecedor"
        acao={
          <Button
            onClick={() => {
              setFornecedorEditando(null)
              setModalAberto(true)
            }}
          >
            <Plus size={16} />
            Novo Fornecedor
          </Button>
        }
      />

      {carregando && <Carregando />}
      {!carregando && (!fornecedores || fornecedores.length === 0) && (
        <Vazio titulo="Nenhum fornecedor cadastrado" />
      )}

      <div className="space-y-2">
        {fornecedores?.map((fornecedor) => {
          const expandido = fornecedorExpandidoId === fornecedor.id
          return (
            <div key={fornecedor.id} className="rounded-xl border border-gray-100 shadow-soft">
              <div className="flex items-center justify-between p-3">
                <button
                  className="flex-1 text-left"
                  onClick={() => setFornecedorExpandidoId(expandido ? null : fornecedor.id)}
                >
                  <p className="text-sm font-medium text-gray-900">{fornecedor.nome}</p>
                  <p className="text-xs text-gray-500">
                    {LABEL_TIPO[fornecedor.tipo] ?? '—'} · {formatarTelefone(fornecedor.telefone)}
                  </p>
                </button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setFornecedorEditando(fornecedor)
                    setModalAberto(true)
                  }}
                >
                  Editar
                </Button>
              </div>
              {expandido && <HistoricoFornecedor fornecedor={fornecedor} />}
            </div>
          )
        })}
      </div>

      <Modal
        aberto={modalAberto}
        onClose={() => setModalAberto(false)}
        titulo={fornecedorEditando ? 'Editar Fornecedor' : 'Novo Fornecedor'}
      >
        <FormularioFornecedor
          fornecedor={fornecedorEditando}
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

function FormularioFornecedor({ fornecedor, onSalvo, onCancelar }) {
  const [nome, setNome] = useState(fornecedor?.nome ?? '')
  const [tipo, setTipo] = useState(fornecedor?.tipo ?? 'armacao')
  const [cnpj, setCnpj] = useState(fornecedor?.cnpj ?? '')
  const [contato, setContato] = useState(fornecedor?.contato ?? '')
  const [telefone, setTelefone] = useState(fornecedor?.telefone ?? '')
  const [email, setEmail] = useState(fornecedor?.email ?? '')
  const [prazoMedioDias, setPrazoMedioDias] = useState(fornecedor?.prazo_medio_dias ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  async function salvar() {
    if (!nome.trim()) {
      setErro('Informe o nome do fornecedor.')
      return
    }
    setErro(null)
    setSalvando(true)

    const payload = {
      nome,
      tipo,
      cnpj: cnpj || null,
      contato: contato || null,
      telefone: telefone || null,
      email: email || null,
      prazo_medio_dias: prazoMedioDias ? Number(prazoMedioDias) : null,
    }

    const { error } = fornecedor
      ? await supabase.from('fornecedores').update(payload).eq('id', fornecedor.id)
      : await supabase.from('fornecedores').insert(payload)

    setSalvando(false)

    if (error) {
      setErro('Não foi possível salvar o fornecedor.')
      return
    }
    onSalvo()
  }

  return (
    <div className="space-y-3">
      <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
      <Select label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} options={OPCOES_TIPO} />
      <Input label="CNPJ" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
      <Input label="Contato" value={contato} onChange={(e) => setContato(e.target.value)} />
      <Input label="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
      <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input
        label="Prazo médio de entrega prometido (dias)"
        type="number"
        value={prazoMedioDias}
        onChange={(e) => setPrazoMedioDias(e.target.value)}
      />
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button loading={salvando} onClick={salvar}>
          Salvar
        </Button>
      </div>
    </div>
  )
}

function HistoricoFornecedor({ fornecedor }) {
  const { dados: pedidos, carregando } = useSupabaseQuery(
    (supabase) =>
      supabase
        .from('pedidos_lente')
        .select('*, produtos(marca, modelo)')
        .eq('fornecedor_id', fornecedor.id)
        .order('created_at', { ascending: false }),
    [fornecedor.id]
  )

  const recebidos = pedidos?.filter((p) => p.status === 'recebido' && p.data_recebimento) ?? []
  const prazoMedioReal =
    recebidos.length > 0
      ? Math.round(
          recebidos.reduce((soma, p) => {
            const dias = (new Date(p.data_recebimento) - new Date(p.created_at)) / 86400000
            return soma + dias
          }, 0) / recebidos.length
        )
      : null

  return (
    <div className="border-t border-gray-100 p-3 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-medium text-gray-700">Histórico de pedidos</p>
        {prazoMedioReal !== null && (
          <p className="text-xs text-gray-500">
            Prazo médio real: <span className="font-medium text-gray-800">{prazoMedioReal} dias</span>
            {fornecedor.prazo_medio_dias && ` (prometido: ${fornecedor.prazo_medio_dias} dias)`}
          </p>
        )}
      </div>

      {carregando && <Carregando />}
      {!carregando && (!pedidos || pedidos.length === 0) && (
        <p className="text-gray-400">Nenhum pedido registrado ainda.</p>
      )}

      <div className="space-y-1">
        {pedidos?.map((pedido) => (
          <div key={pedido.id} className="flex justify-between text-gray-600">
            <span>{[pedido.produtos?.marca, pedido.produtos?.modelo].filter(Boolean).join(' ')}</span>
            <span className="text-gray-400">
              {formatarData(pedido.created_at)}
              {pedido.data_recebimento && ` → recebido em ${formatarData(pedido.data_recebimento)}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
