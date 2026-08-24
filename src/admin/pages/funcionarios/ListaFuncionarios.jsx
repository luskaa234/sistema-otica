import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
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
import { convidarFuncionario, alternarAcessoFuncionario } from '../../../shared/lib/funcionarios'
import { formatarMoeda, formatarData, formatarTelefone } from '../../../shared/utils/formatters'
import { ACAO_AUDITORIA_LABEL } from '../../../shared/constants/auditoria'

const OPCOES_PERFIL = [
  { value: 'admin', label: 'Admin', descricao: 'Acesso total ao sistema.' },
  {
    value: 'vendedor',
    label: 'Vendedor',
    descricao: 'Clientes, receitas, vendas e estoque — sem acesso ao financeiro completo.',
  },
  {
    value: 'financeiro',
    label: 'Financeiro',
    descricao: 'Contas a receber/pagar e relatórios — não pode editar ordens de serviço.',
  },
]

export default function ListaFuncionarios() {
  const { perfil } = useAuth()
  const [modalAberto, setModalAberto] = useState(false)
  const [funcionarioEditando, setFuncionarioEditando] = useState(null)
  const [expandidoId, setExpandidoId] = useState(null)
  const [erroAcesso, setErroAcesso] = useState(null)

  const { dados: funcionarios, carregando, refetch } = useSupabaseQuery(
    (supabase) => supabase.from('funcionarios').select('*').order('nome'),
    []
  )

  async function alternarAcesso(funcionario) {
    setErroAcesso(null)
    try {
      await alternarAcessoFuncionario(funcionario.id, !funcionario.ativo)
      refetch()
    } catch {
      setErroAcesso('Não foi possível alterar o acesso.')
    }
  }

  return (
    <div>
      <PageHeader
        titulo="Funcionários"
        descricao="Cadastro e perfis de acesso"
        acao={
          <Button
            onClick={() => {
              setFuncionarioEditando(null)
              setModalAberto(true)
            }}
          >
            <Plus size={16} />
            Novo Funcionário
          </Button>
        }
      />

      {erroAcesso && <p className="mb-3 text-sm text-red-600">{erroAcesso}</p>}

      {carregando && <Carregando />}
      {!carregando && (!funcionarios || funcionarios.length === 0) && (
        <Vazio titulo="Nenhum funcionário cadastrado" />
      )}

      <div className="space-y-2">
        {funcionarios?.map((funcionario) => {
          const expandido = expandidoId === funcionario.id
          return (
            <div key={funcionario.id} className="rounded-xl border border-gray-100 shadow-soft">
              <div className="flex items-center justify-between p-3 text-sm">
                <button
                  className="flex-1 text-left"
                  onClick={() => setExpandidoId(expandido ? null : funcionario.id)}
                >
                  <p className="font-medium text-gray-900">{funcionario.nome}</p>
                  <p className="text-gray-500">
                    {funcionario.email} ·{' '}
                    {OPCOES_PERFIL.find((o) => o.value === funcionario.perfil)?.label}
                  </p>
                </button>
                <div className="flex items-center gap-3">
                  <Badge className={funcionario.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                    {funcionario.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <Button variant="secondary" onClick={() => alternarAcesso(funcionario)}>
                    {funcionario.ativo ? 'Desativar acesso' : 'Reativar acesso'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setFuncionarioEditando(funcionario)
                      setModalAberto(true)
                    }}
                  >
                    Editar
                  </Button>
                </div>
              </div>
              {expandido && funcionario.perfil === 'vendedor' && (
                <DetalheVendedor funcionario={funcionario} />
              )}
            </div>
          )
        })}
      </div>

      {perfil?.perfil === 'admin' && <LogAuditoria funcionarios={funcionarios ?? []} />}

      <Modal
        aberto={modalAberto}
        onClose={() => setModalAberto(false)}
        titulo={funcionarioEditando ? 'Editar Funcionário' : 'Novo Funcionário'}
      >
        <FormularioFuncionario
          funcionario={funcionarioEditando}
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

function FormularioFuncionario({ funcionario, onSalvo, onCancelar }) {
  const [nome, setNome] = useState(funcionario?.nome ?? '')
  const [email, setEmail] = useState(funcionario?.email ?? '')
  const [perfil, setPerfil] = useState(funcionario?.perfil ?? 'vendedor')
  const [telefone, setTelefone] = useState(funcionario?.telefone ?? '')
  const [dataAdmissao, setDataAdmissao] = useState(funcionario?.data_admissao ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  async function salvar() {
    if (!nome.trim() || !email.trim()) {
      setErro('Preencha nome e e-mail.')
      return
    }
    setErro(null)
    setSalvando(true)

    try {
      if (funcionario) {
        const { error } = await supabase
          .from('funcionarios')
          .update({ nome, perfil, telefone: telefone || null, data_admissao: dataAdmissao || null })
          .eq('id', funcionario.id)
        if (error) throw error
      } else {
        await convidarFuncionario({
          nome,
          email,
          perfil,
          telefone: telefone || null,
          data_admissao: dataAdmissao || null,
        })
      }
      onSalvo()
    } catch (err) {
      setErro(err.message?.includes('e-mail') ? err.message : 'Não foi possível salvar o funcionário.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-3">
      <Input label="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} />
      <Input
        label="E-mail (usado para login)"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={Boolean(funcionario)}
      />
      <Select
        label="Perfil de acesso"
        value={perfil}
        onChange={(e) => setPerfil(e.target.value)}
        options={OPCOES_PERFIL}
      />
      <p className="text-xs text-gray-400">{OPCOES_PERFIL.find((o) => o.value === perfil)?.descricao}</p>
      <Input label="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
      <Input
        label="Data de admissão"
        type="date"
        value={dataAdmissao}
        onChange={(e) => setDataAdmissao(e.target.value)}
      />
      {!funcionario && (
        <p className="text-xs text-gray-400">
          Um convite por e-mail será enviado para o funcionário definir a própria senha.
        </p>
      )}
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

function DetalheVendedor({ funcionario }) {
  const inicioAno = `${new Date().getFullYear()}-01-01`
  const inicioMes = new Date().toISOString().slice(0, 8) + '01'

  const { dados: vendasAno } = useSupabaseQuery(
    (supabase) =>
      supabase
        .from('ordens_servico')
        .select('id, valor_total, desconto, created_at, status, numero')
        .eq('vendedor_id', funcionario.id)
        .not('status', 'in', '(orcamento,cancelado)')
        .gte('created_at', inicioAno)
        .order('created_at', { ascending: false }),
    [funcionario.id]
  )

  const { dados: comissoes } = useSupabaseQuery(
    (supabase) => supabase.from('comissoes').select('valor_calculado, status').eq('funcionario_id', funcionario.id),
    [funcionario.id]
  )

  const totalAno = (vendasAno ?? []).reduce((s, os) => s + Number(os.valor_total) - Number(os.desconto ?? 0), 0)
  const totalMes = (vendasAno ?? [])
    .filter((os) => os.created_at >= inicioMes)
    .reduce((s, os) => s + Number(os.valor_total) - Number(os.desconto ?? 0), 0)
  const comissaoAcumulada = (comissoes ?? [])
    .filter((c) => c.status === 'pendente')
    .reduce((s, c) => s + Number(c.valor_calculado), 0)

  return (
    <div className="border-t border-gray-100 p-3 text-sm">
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <p className="text-gray-400">Vendido no mês</p>
          <p className="font-medium text-gray-900">{formatarMoeda(totalMes)}</p>
        </div>
        <div>
          <p className="text-gray-400">Vendido no ano</p>
          <p className="font-medium text-gray-900">{formatarMoeda(totalAno)}</p>
        </div>
        <div>
          <p className="text-gray-400">Comissão pendente</p>
          <p className="font-medium text-gray-900">{formatarMoeda(comissaoAcumulada)}</p>
        </div>
      </div>
      <p className="mb-1 font-medium text-gray-700">Últimas OS fechadas</p>
      <div className="space-y-1 text-gray-600">
        {(vendasAno ?? []).slice(0, 5).map((os) => (
          <div key={os.id} className="flex justify-between">
            <Link to={`/admin/vendas/${os.id}`} className="text-blue-600 hover:underline">
              #{os.numero}
            </Link>
            <span>{formatarData(os.created_at)}</span>
            <span>{formatarMoeda(Number(os.valor_total) - Number(os.desconto ?? 0))}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LogAuditoria({ funcionarios }) {
  const [funcionarioFiltro, setFuncionarioFiltro] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  const { dados: logs, carregando } = useSupabaseQuery(
    (supabase) => {
      let query = supabase
        .from('logs_auditoria')
        .select('*, funcionarios(nome)')
        .order('created_at', { ascending: false })
        .limit(100)
      if (funcionarioFiltro) query = query.eq('funcionario_id', funcionarioFiltro)
      if (dataInicio) query = query.gte('created_at', dataInicio)
      if (dataFim) query = query.lte('created_at', `${dataFim}T23:59:59`)
      return query
    },
    [funcionarioFiltro, dataInicio, dataFim]
  )

  return (
    <div className="mt-8">
      <h3 className="mb-3 text-sm font-medium text-gray-700">Log de auditoria</h3>
      <div className="mb-3 flex flex-wrap gap-3">
        <Select
          value={funcionarioFiltro}
          onChange={(e) => setFuncionarioFiltro(e.target.value)}
          options={[{ value: '', label: 'Todos os funcionários' }, ...funcionarios.map((f) => ({ value: f.id, label: f.nome }))]}
        />
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
      {!carregando && (!logs || logs.length === 0) && <Vazio titulo="Nenhum registro de auditoria" />}

      <div className="space-y-1 text-sm">
        {logs?.map((log) => {
          const linkPorTabela = {
            ordens_servico: `/admin/vendas/${log.registro_id}`,
            clientes: `/admin/clientes/${log.registro_id}`,
          }
          const link = linkPorTabela[log.tabela_afetada]
          return (
            <div key={log.id} className="flex justify-between border-b border-gray-50 py-1.5 text-gray-600">
              <span>
                <span className="font-medium text-gray-900">{log.funcionarios?.nome}</span> —{' '}
                {ACAO_AUDITORIA_LABEL[log.acao] ?? log.acao}
                {link && (
                  <>
                    {' '}
                    (
                    <Link to={link} className="text-blue-600 hover:underline">
                      ver
                    </Link>
                    )
                  </>
                )}
              </span>
              <span className="text-gray-400">{formatarData(log.created_at)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
