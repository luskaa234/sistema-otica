import { useMemo, useState } from 'react'
import { Plus, AlertTriangle } from 'lucide-react'
import { PageHeader } from '../../../shared/components/PageHeader'
import { Button } from '../../../shared/components/Button'
import { Input } from '../../../shared/components/Input'
import { Select } from '../../../shared/components/Select'
import { Modal } from '../../../shared/components/Modal'
import { Badge } from '../../../shared/components/Badge'
import { Carregando, Vazio } from '../../../shared/components/EstadoTela'
import { useSupabaseQuery } from '../../../shared/hooks/useSupabaseQuery'
import { useAuth } from '../../../shared/hooks/useAuth'
import { supabase } from '../../../shared/lib/supabaseClient'
import { formatarMoeda, formatarData } from '../../../shared/utils/formatters'

const OPCOES_CATEGORIA = [
  { value: 'fornecedor', label: 'Fornecedor' },
  { value: 'aluguel', label: 'Aluguel' },
  { value: 'laboratorio', label: 'Laboratório' },
  { value: 'funcionarios', label: 'Funcionários' },
  { value: 'outras', label: 'Outras' },
]

const FILTROS = [
  { value: 'todas', label: 'Todas' },
  { value: 'vencidas', label: 'Vencidas' },
  { value: 'a_vencer', label: 'A vencer' },
  { value: 'pagas', label: 'Pagas' },
]

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function ContasPagar() {
  const { perfil } = useAuth()
  const [filtro, setFiltro] = useState('todas')
  const [modalAberto, setModalAberto] = useState(false)
  const [contaEditando, setContaEditando] = useState(null)

  const { dados: contas, carregando, refetch } = useSupabaseQuery(
    (supabase) =>
      supabase.from('contas_pagar').select('*, fornecedores(nome)').order('data_vencimento'),
    []
  )

  const contasFiltradas = useMemo(() => {
    if (!contas) return []
    const hoje = hojeISO()
    switch (filtro) {
      case 'vencidas':
        return contas.filter((c) => c.status !== 'pago' && c.data_vencimento < hoje)
      case 'a_vencer':
        return contas.filter((c) => c.status !== 'pago' && c.data_vencimento >= hoje)
      case 'pagas':
        return contas.filter((c) => c.status === 'pago')
      default:
        return contas
    }
  }, [contas, filtro])

  const proximosSeteDias = useMemo(() => {
    if (!contas) return []
    const hoje = new Date()
    const limite = new Date()
    limite.setDate(limite.getDate() + 7)
    return contas.filter((c) => {
      if (c.status === 'pago') return false
      const vencimento = new Date(c.data_vencimento)
      return vencimento >= hoje && vencimento <= limite
    })
  }, [contas])

  async function marcarComoPago(conta) {
    await supabase
      .from('contas_pagar')
      .update({ status: 'pago', data_pagamento: hojeISO() })
      .eq('id', conta.id)

    if (perfil?.id) {
      await supabase.from('logs_auditoria').insert({
        funcionario_id: perfil.id,
        acao: 'editar_financeiro',
        tabela_afetada: 'contas_pagar',
        registro_id: conta.id,
        detalhes: { descricao: conta.descricao, valor: conta.valor, acao_especifica: 'marcar_como_pago' },
      })
    }

    refetch()
  }

  return (
    <div>
      <PageHeader
        titulo="Contas a Pagar"
        descricao="Fornecedores, aluguel, laboratório, funcionários e outras despesas"
        acao={
          <Button
            onClick={() => {
              setContaEditando(null)
              setModalAberto(true)
            }}
          >
            <Plus size={16} />
            Nova Conta
          </Button>
        }
      />

      {proximosSeteDias.length > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle size={16} />
          {proximosSeteDias.length} conta(s) vencendo nos próximos 7 dias.
        </div>
      )}

      <div className="mb-4 flex gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltro(f.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filtro === f.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {carregando && <Carregando />}
      {!carregando && contasFiltradas.length === 0 && <Vazio titulo="Nenhuma conta encontrada" />}

      <div className="space-y-2">
        {contasFiltradas.map((conta) => {
          const vencida = conta.status !== 'pago' && conta.data_vencimento < hojeISO()
          return (
            <div
              key={conta.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm"
            >
              <div>
                <p className="font-medium text-gray-900">{conta.descricao}</p>
                <p className="text-gray-500">
                  {OPCOES_CATEGORIA.find((c) => c.value === conta.categoria)?.label ?? conta.categoria}
                  {conta.fornecedores?.nome && ` · ${conta.fornecedores.nome}`}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className={vencida ? 'font-medium text-red-600' : 'text-gray-700'}>
                  Vence {formatarData(conta.data_vencimento)}
                </span>
                <span className="font-medium text-gray-900">{formatarMoeda(conta.valor)}</span>
                {conta.status === 'pago' ? (
                  <Badge className="bg-green-100 text-green-700">Pago</Badge>
                ) : (
                  <Button variant="secondary" onClick={() => marcarComoPago(conta)}>
                    Marcar como pago
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => {
                    setContaEditando(conta)
                    setModalAberto(true)
                  }}
                >
                  Editar
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      <Modal
        aberto={modalAberto}
        onClose={() => setModalAberto(false)}
        titulo={contaEditando ? 'Editar Conta' : 'Nova Conta a Pagar'}
      >
        <FormularioContaPagar
          conta={contaEditando}
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

function FormularioContaPagar({ conta, onSalvo, onCancelar }) {
  const [descricao, setDescricao] = useState(conta?.descricao ?? '')
  const [categoria, setCategoria] = useState(conta?.categoria ?? OPCOES_CATEGORIA[0].value)
  const [fornecedorId, setFornecedorId] = useState(conta?.fornecedor_id ?? '')
  const [valor, setValor] = useState(conta?.valor ?? '')
  const [dataVencimento, setDataVencimento] = useState(conta?.data_vencimento ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  const { dados: fornecedores } = useSupabaseQuery(
    (supabase) => supabase.from('fornecedores').select('id, nome').order('nome'),
    []
  )

  async function salvar() {
    if (!descricao.trim() || !valor || !dataVencimento) {
      setErro('Preencha descrição, valor e data de vencimento.')
      return
    }
    setErro(null)
    setSalvando(true)

    const payload = {
      descricao,
      categoria,
      fornecedor_id: fornecedorId || null,
      valor: Number(valor),
      data_vencimento: dataVencimento,
    }

    const { error } = conta
      ? await supabase.from('contas_pagar').update(payload).eq('id', conta.id)
      : await supabase.from('contas_pagar').insert(payload)

    setSalvando(false)

    if (error) {
      setErro('Não foi possível salvar a conta.')
      return
    }
    onSalvo()
  }

  return (
    <div className="space-y-3">
      <Input label="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      <Select label="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} options={OPCOES_CATEGORIA} />
      <Select
        label="Fornecedor (opcional)"
        value={fornecedorId}
        onChange={(e) => setFornecedorId(e.target.value)}
        options={[{ value: '', label: 'Nenhum' }, ...(fornecedores ?? []).map((f) => ({ value: f.id, label: f.nome }))]}
      />
      <Input label="Valor (R$)" type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
      <Input
        label="Data de vencimento"
        type="date"
        value={dataVencimento}
        onChange={(e) => setDataVencimento(e.target.value)}
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
