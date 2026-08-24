import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Pencil, Plus } from 'lucide-react'
import { PageHeader } from '../../../shared/components/PageHeader'
import { Button } from '../../../shared/components/Button'
import { Carregando, Erro, Vazio } from '../../../shared/components/EstadoTela'
import { useSupabaseQuery } from '../../../shared/hooks/useSupabaseQuery'
import {
  formatarCPF,
  formatarTelefone,
  formatarMoeda,
  formatarData,
} from '../../../shared/utils/formatters'

const ABAS = [
  { chave: 'visao_geral', label: 'Visão Geral' },
  { chave: 'receitas', label: 'Receitas' },
  { chave: 'historico', label: 'Histórico de Compras' },
]

const LABEL_TIPO_LENTE = {
  visao_simples: 'Visão simples',
  multifocal: 'Multifocal',
  bifocal: 'Bifocal',
}

const CAMPOS_COMPARAVEIS = [
  ['esferico_od', 'Esférico OD'],
  ['cilindrico_od', 'Cilíndrico OD'],
  ['eixo_od', 'Eixo OD'],
  ['esferico_oe', 'Esférico OE'],
  ['cilindrico_oe', 'Cilíndrico OE'],
  ['eixo_oe', 'Eixo OE'],
  ['adicao', 'Adição'],
  ['dnp', 'DNP'],
  ['altura', 'Altura'],
  ['tipo_lente', 'Tipo de lente'],
]

const STATUS_LABEL = {
  orcamento: 'Orçamento',
  aprovado: 'Aprovado',
  em_producao: 'Em produção',
  pronto: 'Pronto',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

function valorExibicao(campo, valor) {
  if (valor === null || valor === undefined) return '—'
  return campo === 'tipo_lente' ? LABEL_TIPO_LENTE[valor] ?? valor : valor
}

function calcularDiferencas(atual, anterior) {
  if (!anterior) return []
  return CAMPOS_COMPARAVEIS.filter(([campo]) => atual[campo] !== anterior[campo]).map(
    ([campo, label]) => ({
      label,
      de: valorExibicao(campo, anterior[campo]),
      para: valorExibicao(campo, atual[campo]),
    })
  )
}

export default function DetalheCliente() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [abaAtiva, setAbaAtiva] = useState('visao_geral')
  const [receitaExpandidaId, setReceitaExpandidaId] = useState(null)

  const { dados: cliente, carregando: carregandoCliente, erro: erroCliente } = useSupabaseQuery(
    (supabase) => supabase.from('clientes').select('*').eq('id', id).single(),
    [id]
  )

  const { dados: ordensServico, carregando: carregandoOS } = useSupabaseQuery(
    (supabase) =>
      supabase
        .from('ordens_servico')
        .select('*')
        .eq('cliente_id', id)
        .order('created_at', { ascending: false }),
    [id]
  )

  const { dados: receitas, carregando: carregandoReceitas } = useSupabaseQuery(
    (supabase) =>
      supabase
        .from('receitas')
        .select('*')
        .eq('cliente_id', id)
        .order('created_at', { ascending: false }),
    [id]
  )

  const resumoCompras = useMemo(() => {
    if (!ordensServico) return { totalGasto: 0, quantidade: 0, ultimaCompra: null }
    const validas = ordensServico.filter((os) => os.status !== 'cancelado')
    return {
      totalGasto: validas.reduce((soma, os) => soma + Number(os.valor_total) - Number(os.desconto ?? 0), 0),
      quantidade: validas.length,
      ultimaCompra: validas[0]?.created_at ?? null,
    }
  }, [ordensServico])

  if (carregandoCliente) return <Carregando texto="Carregando cliente..." />
  if (erroCliente || !cliente) return <Erro mensagem="Cliente não encontrado." />

  return (
    <div>
      <PageHeader
        titulo={cliente.nome}
        descricao={formatarCPF(cliente.cpf)}
        acao={
          <Button variant="secondary" onClick={() => navigate(`/admin/clientes/${id}/editar`)}>
            <Pencil size={16} />
            Editar
          </Button>
        }
      />

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-gray-200">
        {ABAS.map((aba) => (
          <button
            key={aba.chave}
            onClick={() => setAbaAtiva(aba.chave)}
            className={`flex-shrink-0 whitespace-nowrap px-4 py-2 text-sm font-medium ${
              abaAtiva === aba.chave
                ? 'border-b-2 border-blue-600 text-blue-700'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {aba.label}
          </button>
        ))}
      </div>

      {abaAtiva === 'visao_geral' && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-100 shadow-soft p-4">
            <h3 className="mb-3 text-sm font-medium text-gray-500">Dados cadastrais</h3>
            <dl className="space-y-2 text-sm">
              <Campo rotulo="Telefone" valor={formatarTelefone(cliente.telefone)} />
              <Campo rotulo="E-mail" valor={cliente.email || '—'} />
              <Campo rotulo="Data de nascimento" valor={formatarData(cliente.data_nascimento) || '—'} />
              <Campo
                rotulo="Endereço"
                valor={
                  cliente.endereco
                    ? `${cliente.endereco}, ${cliente.numero || 's/n'} — ${cliente.bairro || ''} ${cliente.cidade || ''}/${cliente.uf || ''}`
                    : '—'
                }
              />
              <Campo rotulo="Observações" valor={cliente.observacoes || '—'} />
              <Campo rotulo="Status" valor={cliente.ativo ? 'Ativo' : 'Inativo'} />
            </dl>
          </div>

          <div className="rounded-xl border border-gray-100 shadow-soft p-4">
            <h3 className="mb-3 text-sm font-medium text-gray-500">Resumo de compras</h3>
            {carregandoOS ? (
              <Carregando />
            ) : (
              <dl className="space-y-2 text-sm">
                <Campo rotulo="Total gasto" valor={formatarMoeda(resumoCompras.totalGasto)} />
                <Campo rotulo="Quantidade de compras" valor={resumoCompras.quantidade} />
                <Campo
                  rotulo="Última compra"
                  valor={resumoCompras.ultimaCompra ? formatarData(resumoCompras.ultimaCompra) : '—'}
                />
              </dl>
            )}
          </div>
        </div>
      )}

      {abaAtiva === 'receitas' && (
        <div>
          <div className="mb-4 flex justify-end">
            <Button onClick={() => navigate(`/admin/clientes/${id}/receitas/nova`)}>
              <Plus size={16} />
              Nova Receita
            </Button>
          </div>

          {carregandoReceitas && <Carregando />}

          {!carregandoReceitas && (!receitas || receitas.length === 0) && (
            <Vazio
              titulo="Nenhuma receita cadastrada"
              descricao="Cadastre a primeira receita óptica deste cliente."
            />
          )}

          <div className="space-y-3">
            {receitas?.map((receita, index) => {
              const anterior = receitas[index + 1]
              const diferencas = calcularDiferencas(receita, anterior)
              const expandida = receitaExpandidaId === receita.id

              return (
                <div key={receita.id} className="rounded-xl border border-gray-100 shadow-soft">
                  <button
                    onClick={() => setReceitaExpandidaId(expandida ? null : receita.id)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900">
                        {formatarData(receita.data_consulta) || formatarData(receita.created_at)}
                      </span>
                      {receita.ativa && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Ativa
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">{receita.medico}</span>
                  </button>

                  {expandida && (
                    <div className="border-t border-gray-100 p-4 text-sm">
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        <Campo rotulo="Médico" valor={receita.medico || '—'} />
                        <Campo
                          rotulo="Tipo de lente"
                          valor={LABEL_TIPO_LENTE[receita.tipo_lente] ?? '—'}
                        />
                        <Campo rotulo="Esférico OD" valor={receita.esferico_od ?? '—'} />
                        <Campo rotulo="Cilíndrico OD" valor={receita.cilindrico_od ?? '—'} />
                        <Campo rotulo="Eixo OD" valor={receita.eixo_od ?? '—'} />
                        <Campo rotulo="Esférico OE" valor={receita.esferico_oe ?? '—'} />
                        <Campo rotulo="Cilíndrico OE" valor={receita.cilindrico_oe ?? '—'} />
                        <Campo rotulo="Eixo OE" valor={receita.eixo_oe ?? '—'} />
                        <Campo rotulo="Adição" valor={receita.adicao ?? '—'} />
                        <Campo rotulo="DNP" valor={receita.dnp ?? '—'} />
                        <Campo rotulo="Altura" valor={receita.altura ?? '—'} />
                      </div>

                      {receita.foto_url && (
                        <a
                          href={receita.foto_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-block text-sm text-blue-600 hover:underline"
                        >
                          Ver foto da receita física
                        </a>
                      )}

                      {diferencas.length > 0 && (
                        <div className="mt-4 rounded-lg bg-amber-50 p-3">
                          <p className="mb-1 text-xs font-medium text-amber-800">
                            O que mudou desde a receita anterior:
                          </p>
                          <ul className="space-y-0.5 text-xs text-amber-800">
                            {diferencas.map((dif) => (
                              <li key={dif.label}>
                                {dif.label}: {dif.de} → {dif.para}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {abaAtiva === 'historico' && (
        <div>
          {carregandoOS && <Carregando />}
          {!carregandoOS && (!ordensServico || ordensServico.length === 0) && (
            <Vazio titulo="Nenhuma compra registrada ainda" />
          )}
          <div className="space-y-2">
            {ordensServico?.map((os) => (
              <button
                key={os.id}
                onClick={() => navigate(`/admin/vendas/${os.id}`)}
                className="flex w-full items-center justify-between rounded-xl border border-gray-100 shadow-soft px-4 py-3 text-left hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-900">{formatarData(os.created_at)}</p>
                  <p className="text-xs text-gray-500">{STATUS_LABEL[os.status] ?? os.status}</p>
                </div>
                <span className="font-medium text-gray-900">{formatarMoeda(os.valor_total)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Campo({ rotulo, valor }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500">{rotulo}</dt>
      <dd className="text-right text-gray-900">{valor}</dd>
    </div>
  )
}
