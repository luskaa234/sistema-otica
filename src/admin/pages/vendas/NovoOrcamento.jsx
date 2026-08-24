import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Trash2, X } from 'lucide-react'
import { PageHeader } from '../../../shared/components/PageHeader'
import { Button } from '../../../shared/components/Button'
import { Input } from '../../../shared/components/Input'
import { Select } from '../../../shared/components/Select'
import { Modal } from '../../../shared/components/Modal'
import { Carregando } from '../../../shared/components/EstadoTela'
import { supabase } from '../../../shared/lib/supabaseClient'
import { useAuth } from '../../../shared/hooks/useAuth'
import { formatarMoeda, mascararCPF, mascararTelefone } from '../../../shared/utils/formatters'
import { validarCPF } from '../../../shared/utils/validators'

const ETAPAS = ['Cliente', 'Receita', 'Itens', 'Fechamento']

const OPCOES_TIPO_LENTE = [
  { value: 'visao_simples', label: 'Visão simples' },
  { value: 'multifocal', label: 'Multifocal' },
  { value: 'bifocal', label: 'Bifocal' },
]

const OPCOES_FORMA_PAGAMENTO = [
  { value: 'pix', label: 'PIX' },
  { value: 'cartao_credito', label: 'Cartão de crédito' },
  { value: 'cartao_debito', label: 'Cartão de débito' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'dinheiro', label: 'Dinheiro' },
]

const OPCOES_TIPO_PRODUTO = [
  { value: 'armacao', label: 'Armações' },
  { value: 'lente', label: 'Lentes' },
  { value: 'acessorio', label: 'Acessórios' },
]

export default function NovoOrcamento() {
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const [etapa, setEtapa] = useState(0)
  const [erroGeral, setErroGeral] = useState(null)
  const [salvando, setSalvando] = useState(false)

  // Etapa 1 — Cliente
  const [buscaCliente, setBuscaCliente] = useState('')
  const [resultadosClientes, setResultadosClientes] = useState([])
  const [clienteSelecionado, setClienteSelecionado] = useState(null)
  const [modalNovoClienteAberto, setModalNovoClienteAberto] = useState(false)

  // Etapa 2 — Receita
  const [receitas, setReceitas] = useState([])
  const [carregandoReceitas, setCarregandoReceitas] = useState(false)
  const [receitaSelecionadaId, setReceitaSelecionadaId] = useState(null)
  const [modoNovaReceita, setModoNovaReceita] = useState(false)

  // Etapa 3 — Itens
  const [tipoProduto, setTipoProduto] = useState('armacao')
  const [buscaProduto, setBuscaProduto] = useState('')
  const [resultadosProdutos, setResultadosProdutos] = useState([])
  const [itens, setItens] = useState([])

  // Etapa 4 — Fechamento
  const [tipoDesconto, setTipoDesconto] = useState('valor')
  const [valorDesconto, setValorDesconto] = useState('0')
  const [motivoDesconto, setMotivoDesconto] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('pix')
  const [prazoEntrega, setPrazoEntrega] = useState('')
  const [vendedorId, setVendedorId] = useState(perfil?.id ?? '')
  const [vendedores, setVendedores] = useState([])
  const [limiteDescontoPercentual, setLimiteDescontoPercentual] = useState(10)

  useEffect(() => {
    if (perfil?.id) setVendedorId(perfil.id)
  }, [perfil])

  useEffect(() => {
    if (perfil?.tipo === 'funcionario' && perfil?.perfil === 'admin') {
      supabase
        .from('funcionarios')
        .select('id, nome')
        .eq('ativo', true)
        .then(({ data }) => setVendedores(data ?? []))
    }
  }, [perfil])

  useEffect(() => {
    supabase
      .from('configuracoes_loja')
      .select('desconto_limite_percentual')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.desconto_limite_percentual != null) {
          setLimiteDescontoPercentual(Number(data.desconto_limite_percentual))
        }
      })
  }, [])

  // ===== Etapa 1 =====
  async function buscarClientes(termo) {
    setBuscaCliente(termo)
    if (termo.trim().length < 2) {
      setResultadosClientes([])
      return
    }
    const { data } = await supabase
      .from('clientes')
      .select('id, nome, cpf, telefone')
      .or(`nome.ilike.%${termo}%,cpf.ilike.%${termo}%`)
      .limit(10)
    setResultadosClientes(data ?? [])
  }

  function selecionarCliente(cliente) {
    setClienteSelecionado(cliente)
    setResultadosClientes([])
    setBuscaCliente('')
    setReceitaSelecionadaId(null)
  }

  // ===== Etapa 2 =====
  useEffect(() => {
    if (!clienteSelecionado) return
    setCarregandoReceitas(true)
    supabase
      .from('receitas')
      .select('*')
      .eq('cliente_id', clienteSelecionado.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setReceitas(data ?? [])
        const ativa = (data ?? []).find((r) => r.ativa)
        setReceitaSelecionadaId(ativa?.id ?? null)
        setCarregandoReceitas(false)
      })
  }, [clienteSelecionado])

  // ===== Etapa 3 =====
  useEffect(() => {
    let ativo = true
    const termo = buscaProduto.trim()
    supabase
      .from('produtos')
      .select('*')
      .eq('tipo', tipoProduto)
      .eq('ativo', true)
      .or(termo ? `marca.ilike.%${termo}%,modelo.ilike.%${termo}%,sku.ilike.%${termo}%` : 'ativo.eq.true')
      .limit(20)
      .then(({ data }) => {
        if (ativo) setResultadosProdutos(data ?? [])
      })
    return () => {
      ativo = false
    }
  }, [tipoProduto, buscaProduto])

  function adicionarItem(produto) {
    setItens((atual) => [
      ...atual,
      {
        chave: crypto.randomUUID(),
        produto_id: produto.id,
        descricao: [produto.marca, produto.modelo, produto.cor].filter(Boolean).join(' '),
        quantidade: 1,
        valor_unitario: Number(produto.preco),
      },
    ])
  }

  function removerItem(chave) {
    setItens((atual) => atual.filter((item) => item.chave !== chave))
  }

  function alterarQuantidade(chave, quantidade) {
    setItens((atual) =>
      atual.map((item) => (item.chave === chave ? { ...item, quantidade: Math.max(1, quantidade) } : item))
    )
  }

  // ===== Cálculos =====
  const subtotal = itens.reduce((soma, item) => soma + item.valor_unitario * item.quantidade, 0)
  const descontoCalculado =
    tipoDesconto === 'percentual' ? (subtotal * Number(valorDesconto || 0)) / 100 : Number(valorDesconto || 0)
  const total = Math.max(0, subtotal - descontoCalculado)
  const percentualDescontoEfetivo = subtotal > 0 ? (descontoCalculado / subtotal) * 100 : 0
  const precisaMotivo = percentualDescontoEfetivo > limiteDescontoPercentual

  function avancar() {
    setErroGeral(null)
    if (etapa === 0 && !clienteSelecionado) {
      setErroGeral('Selecione ou cadastre um cliente para continuar.')
      return
    }
    if (etapa === 1 && !receitaSelecionadaId) {
      setErroGeral('Selecione uma receita ativa ou cadastre uma nova.')
      return
    }
    if (etapa === 2 && itens.length === 0) {
      setErroGeral('Adicione ao menos um item ao orçamento.')
      return
    }
    setEtapa((e) => Math.min(ETAPAS.length - 1, e + 1))
  }

  function voltar() {
    setErroGeral(null)
    setEtapa((e) => Math.max(0, e - 1))
  }

  async function salvar(statusFinal) {
    setErroGeral(null)

    if (precisaMotivo && !motivoDesconto.trim()) {
      setErroGeral(
        `Desconto acima de ${limiteDescontoPercentual}% exige um motivo (Etapa 4).`
      )
      return
    }

    setSalvando(true)
    try {
      const { data: osId, error } = await supabase.rpc('criar_ordem_servico', {
        p_cliente_id: clienteSelecionado.id,
        p_receita_id: receitaSelecionadaId,
        p_vendedor_id: vendedorId,
        p_status: statusFinal,
        p_valor_total: subtotal,
        p_desconto: descontoCalculado,
        p_motivo_desconto: motivoDesconto || null,
        p_forma_pagamento: formaPagamento,
        p_prazo_entrega: prazoEntrega || null,
        p_itens: itens.map((item) => ({
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
        })),
      })

      if (error) throw error

      if (precisaMotivo && perfil?.id) {
        await supabase.from('logs_auditoria').insert({
          funcionario_id: perfil.id,
          acao: 'aplicar_desconto',
          tabela_afetada: 'ordens_servico',
          registro_id: osId,
          detalhes: { valor: descontoCalculado, percentual: percentualDescontoEfetivo, motivo: motivoDesconto },
        })
      }

      navigate(`/admin/vendas/${osId}`)
    } catch {
      setErroGeral('Não foi possível salvar a OS. Tente novamente.')
      setSalvando(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader titulo="Novo Orçamento" />

      <div className="mb-6 flex items-center gap-2">
        {ETAPAS.map((nome, indice) => (
          <div key={nome} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                indice === etapa
                  ? 'bg-brand-600 text-white shadow-soft ring-4 ring-brand-100'
                  : indice < etapa
                    ? 'bg-brand-100 text-brand-700'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {indice + 1}
            </div>
            <span className={`text-sm ${indice === etapa ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>
              {nome}
            </span>
            {indice < ETAPAS.length - 1 && (
              <div className={`mx-2 h-px w-8 ${indice < etapa ? 'bg-brand-200' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {etapa === 0 && (
        <div>
          {clienteSelecionado ? (
            <div className="flex items-center justify-between rounded-xl border border-gray-100 shadow-soft p-4">
              <div>
                <p className="font-medium text-gray-900">{clienteSelecionado.nome}</p>
                <p className="text-sm text-gray-500">{formatarTelefone(clienteSelecionado.telefone)}</p>
              </div>
              <Button variant="secondary" onClick={() => setClienteSelecionado(null)}>
                Trocar cliente
              </Button>
            </div>
          ) : (
            <div>
              <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={buscaCliente}
                  onChange={(e) => buscarClientes(e.target.value)}
                  placeholder="Buscar cliente por nome ou CPF"
                  className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              {resultadosClientes.length > 0 && (
                <div className="mb-3 divide-y divide-gray-100 rounded-xl border border-gray-100 shadow-soft">
                  {resultadosClientes.map((cliente) => (
                    <button
                      key={cliente.id}
                      onClick={() => selecionarCliente(cliente)}
                      className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      <span>{cliente.nome}</span>
                      <span className="text-gray-400">{formatarTelefone(cliente.telefone)}</span>
                    </button>
                  ))}
                </div>
              )}

              <Button variant="secondary" onClick={() => setModalNovoClienteAberto(true)}>
                <Plus size={16} />
                Cadastrar novo cliente
              </Button>
            </div>
          )}
        </div>
      )}

      {etapa === 1 && (
        <div>
          {carregandoReceitas && <Carregando />}

          {!carregandoReceitas && !modoNovaReceita && (
            <div className="space-y-2">
              {receitas.length === 0 && (
                <p className="mb-3 text-sm text-gray-500">Este cliente ainda não tem receita cadastrada.</p>
              )}
              {receitas.map((receita) => (
                <label
                  key={receita.id}
                  className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 text-sm ${
                    receitaSelecionadaId === receita.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      checked={receitaSelecionadaId === receita.id}
                      onChange={() => setReceitaSelecionadaId(receita.id)}
                    />
                    <span>
                      OD {receita.esferico_od ?? '—'}/{receita.cilindrico_od ?? '—'} · OE{' '}
                      {receita.esferico_oe ?? '—'}/{receita.cilindrico_oe ?? '—'} · {receita.tipo_lente}
                    </span>
                  </div>
                  {receita.ativa && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Ativa
                    </span>
                  )}
                </label>
              ))}

              <Button variant="secondary" onClick={() => setModoNovaReceita(true)}>
                <Plus size={16} />
                Criar nova receita
              </Button>
            </div>
          )}

          {modoNovaReceita && (
            <NovaReceitaInline
              clienteId={clienteSelecionado.id}
              onCancelar={() => setModoNovaReceita(false)}
              onCriada={(novaReceita) => {
                setReceitas((atual) => [novaReceita, ...atual.map((r) => ({ ...r, ativa: false }))])
                setReceitaSelecionadaId(novaReceita.id)
                setModoNovaReceita(false)
              }}
            />
          )}
        </div>
      )}

      {etapa === 2 && (
        <div>
          <div className="mb-3 flex gap-2">
            {OPCOES_TIPO_PRODUTO.map((opcao) => (
              <button
                key={opcao.value}
                onClick={() => setTipoProduto(opcao.value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  tipoProduto === opcao.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {opcao.label}
              </button>
            ))}
          </div>

          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={buscaProduto}
              onChange={(e) => setBuscaProduto(e.target.value)}
              placeholder="Buscar por marca, modelo ou SKU"
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {resultadosProdutos.map((produto) => (
              <div
                key={produto.id}
                className="flex items-center justify-between rounded-xl border border-gray-100 shadow-soft p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {[produto.marca, produto.modelo, produto.cor].filter(Boolean).join(' ')}
                  </p>
                  <p className="text-gray-500">{formatarMoeda(produto.preco)}</p>
                </div>
                <Button variant="secondary" onClick={() => adicionarItem(produto)}>
                  <Plus size={14} />
                </Button>
              </div>
            ))}
            {resultadosProdutos.length === 0 && (
              <p className="text-sm text-gray-400">Nenhum produto encontrado.</p>
            )}
          </div>

          <h3 className="mb-2 text-sm font-medium text-gray-700">Itens adicionados</h3>
          {itens.length === 0 && <p className="text-sm text-gray-400">Nenhum item ainda.</p>}
          <div className="space-y-2">
            {itens.map((item) => (
              <div
                key={item.chave}
                className="flex items-center justify-between rounded-xl border border-gray-100 shadow-soft p-3 text-sm"
              >
                <span>{item.descricao}</span>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    value={item.quantidade}
                    onChange={(e) => alterarQuantidade(item.chave, Number(e.target.value))}
                    className="w-16 rounded border border-gray-300 px-2 py-1 text-center"
                  />
                  <span className="w-24 text-right">
                    {formatarMoeda(item.valor_unitario * item.quantidade)}
                  </span>
                  <button onClick={() => removerItem(item.chave)} className="text-red-500 hover:text-red-700">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-right text-sm font-medium text-gray-900">
            Subtotal: {formatarMoeda(subtotal)}
          </p>
        </div>
      )}

      {etapa === 3 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Tipo de desconto"
              value={tipoDesconto}
              onChange={(e) => setTipoDesconto(e.target.value)}
              options={[
                { value: 'valor', label: 'Valor (R$)' },
                { value: 'percentual', label: 'Percentual (%)' },
              ]}
            />
            <Input
              label={tipoDesconto === 'percentual' ? 'Desconto (%)' : 'Desconto (R$)'}
              type="number"
              min={0}
              value={valorDesconto}
              onChange={(e) => setValorDesconto(e.target.value)}
            />
          </div>

          {precisaMotivo && (
            <Input
              label={`Motivo do desconto (obrigatório acima de ${limiteDescontoPercentual}%)`}
              value={motivoDesconto}
              onChange={(e) => setMotivoDesconto(e.target.value)}
            />
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Forma de pagamento"
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value)}
              options={OPCOES_FORMA_PAGAMENTO}
            />
            <Input
              label="Prazo estimado de entrega"
              type="date"
              value={prazoEntrega}
              onChange={(e) => setPrazoEntrega(e.target.value)}
            />
          </div>

          {vendedores.length > 0 && (
            <Select
              label="Vendedor responsável"
              value={vendedorId}
              onChange={(e) => setVendedorId(e.target.value)}
              options={vendedores.map((v) => ({ value: v.id, label: v.nome }))}
            />
          )}

          <div className="rounded-lg bg-gray-50 p-4 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatarMoeda(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Desconto</span>
              <span>{formatarMoeda(descontoCalculado)}</span>
            </div>
            <div className="mt-2 flex justify-between text-base font-semibold text-gray-900">
              <span>Total</span>
              <span>{formatarMoeda(total)}</span>
            </div>
          </div>
        </div>
      )}

      {erroGeral && <p className="mt-4 text-sm text-red-600">{erroGeral}</p>}

      <div className="mt-6 flex justify-between">
        <Button variant="secondary" onClick={voltar} disabled={etapa === 0}>
          Voltar
        </Button>

        {etapa < ETAPAS.length - 1 ? (
          <Button onClick={avancar}>Próxima etapa</Button>
        ) : (
          <div className="flex gap-3">
            <Button variant="secondary" loading={salvando} onClick={() => salvar('orcamento')}>
              Salvar como Orçamento
            </Button>
            <Button loading={salvando} onClick={() => salvar('aprovado')}>
              Aprovar e Gerar OS
            </Button>
          </div>
        )}
      </div>

      <Modal
        aberto={modalNovoClienteAberto}
        onClose={() => setModalNovoClienteAberto(false)}
        titulo="Cadastrar novo cliente"
      >
        <NovoClienteRapido
          onCancelar={() => setModalNovoClienteAberto(false)}
          onCriado={(cliente) => {
            selecionarCliente(cliente)
            setModalNovoClienteAberto(false)
          }}
        />
      </Modal>
    </div>
  )
}

function NovoClienteRapido({ onCriado, onCancelar }) {
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [telefone, setTelefone] = useState('')
  const [erro, setErro] = useState(null)
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    setErro(null)
    if (!nome.trim()) return setErro('Informe o nome.')
    if (!validarCPF(cpf)) return setErro('CPF inválido.')

    setSalvando(true)
    const { data, error } = await supabase
      .from('clientes')
      .insert({ nome, cpf, telefone })
      .select('id, nome, cpf, telefone')
      .single()
    setSalvando(false)

    if (error) {
      setErro(error.code === '23505' ? 'Já existe um cliente com este CPF.' : 'Não foi possível salvar.')
      return
    }
    onCriado(data)
  }

  return (
    <div className="space-y-3">
      <Input label="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} />
      <Input label="CPF" value={cpf} onChange={(e) => setCpf(mascararCPF(e.target.value))} />
      <Input
        label="Telefone/WhatsApp"
        value={telefone}
        onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
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

function NovaReceitaInline({ clienteId, onCriada, onCancelar }) {
  const [campos, setCampos] = useState({
    data_consulta: '',
    medico: '',
    esferico_od: '',
    cilindrico_od: '',
    eixo_od: '',
    esferico_oe: '',
    cilindrico_oe: '',
    eixo_oe: '',
    adicao: '',
    dnp: '',
    altura: '',
    tipo_lente: 'visao_simples',
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  function set(campo, valor) {
    setCampos((atual) => ({ ...atual, [campo]: valor }))
  }

  async function salvar() {
    setErro(null)
    setSalvando(true)

    const numerico = (valor) => (valor === '' ? null : Number(valor))

    const { error: erroDesativar } = await supabase
      .from('receitas')
      .update({ ativa: false })
      .eq('cliente_id', clienteId)
      .eq('ativa', true)

    if (erroDesativar) {
      setErro('Não foi possível salvar a receita.')
      setSalvando(false)
      return
    }

    const { data, error } = await supabase
      .from('receitas')
      .insert({
        cliente_id: clienteId,
        data_consulta: campos.data_consulta || null,
        medico: campos.medico || null,
        esferico_od: numerico(campos.esferico_od),
        cilindrico_od: numerico(campos.cilindrico_od),
        eixo_od: numerico(campos.eixo_od),
        esferico_oe: numerico(campos.esferico_oe),
        cilindrico_oe: numerico(campos.cilindrico_oe),
        eixo_oe: numerico(campos.eixo_oe),
        adicao: numerico(campos.adicao),
        dnp: numerico(campos.dnp),
        altura: numerico(campos.altura),
        tipo_lente: campos.tipo_lente,
        ativa: true,
      })
      .select('*')
      .single()

    setSalvando(false)

    if (error) {
      setErro('Não foi possível salvar a receita.')
      return
    }

    onCriada(data)
  }

  return (
    <div className="space-y-4 rounded-xl border border-gray-100 shadow-soft p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Nova receita</h3>
        <button onClick={onCancelar} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label="Data da consulta"
          type="date"
          value={campos.data_consulta}
          onChange={(e) => set('data_consulta', e.target.value)}
        />
        <Input label="Médico" value={campos.medico} onChange={(e) => set('medico', e.target.value)} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Input
          label="Esférico OD"
          type="number"
          step="0.25"
          value={campos.esferico_od}
          onChange={(e) => set('esferico_od', e.target.value)}
        />
        <Input
          label="Cilíndrico OD"
          type="number"
          step="0.25"
          value={campos.cilindrico_od}
          onChange={(e) => set('cilindrico_od', e.target.value)}
        />
        <Input label="Eixo OD" type="number" value={campos.eixo_od} onChange={(e) => set('eixo_od', e.target.value)} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Input
          label="Esférico OE"
          type="number"
          step="0.25"
          value={campos.esferico_oe}
          onChange={(e) => set('esferico_oe', e.target.value)}
        />
        <Input
          label="Cilíndrico OE"
          type="number"
          step="0.25"
          value={campos.cilindrico_oe}
          onChange={(e) => set('cilindrico_oe', e.target.value)}
        />
        <Input label="Eixo OE" type="number" value={campos.eixo_oe} onChange={(e) => set('eixo_oe', e.target.value)} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Input label="Adição" type="number" step="0.25" value={campos.adicao} onChange={(e) => set('adicao', e.target.value)} />
        <Input label="DNP" type="number" step="0.5" value={campos.dnp} onChange={(e) => set('dnp', e.target.value)} />
        <Input label="Altura" type="number" step="0.5" value={campos.altura} onChange={(e) => set('altura', e.target.value)} />
      </div>

      <Select
        label="Tipo de lente"
        value={campos.tipo_lente}
        onChange={(e) => set('tipo_lente', e.target.value)}
        options={OPCOES_TIPO_LENTE}
      />

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button loading={salvando} onClick={salvar}>
          Salvar receita
        </Button>
      </div>
    </div>
  )
}
