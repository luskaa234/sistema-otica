import { useMemo, useState } from 'react'
import { PageHeader } from '../../../shared/components/PageHeader'
import { Button } from '../../../shared/components/Button'
import { Input } from '../../../shared/components/Input'
import { Select } from '../../../shared/components/Select'
import { Modal } from '../../../shared/components/Modal'
import { Badge } from '../../../shared/components/Badge'
import { Carregando, Vazio } from '../../../shared/components/EstadoTela'
import { useSupabaseQuery } from '../../../shared/hooks/useSupabaseQuery'
import { supabase } from '../../../shared/lib/supabaseClient'
import { formatarMoeda } from '../../../shared/utils/formatters'

const OPCOES_TIPO_REGRA = [
  { value: 'percentual_fixo', label: 'Percentual fixo sobre a venda' },
  { value: 'percentual_categoria', label: 'Percentual por categoria de produto' },
  { value: 'valor_fixo', label: 'Valor fixo por venda' },
]

function dataPadrao(diasAtras) {
  const d = new Date()
  d.setDate(d.getDate() - diasAtras)
  return d.toISOString().slice(0, 10)
}

export default function Comissoes() {
  const [vendedorConfigurando, setVendedorConfigurando] = useState(null)
  const [dataInicio, setDataInicio] = useState(dataPadrao(30))
  const [dataFim, setDataFim] = useState(new Date().toISOString().slice(0, 10))
  const [fechando, setFechando] = useState(false)
  const [mensagemFechamento, setMensagemFechamento] = useState(null)

  const { dados: vendedores, carregando: carregandoVendedores } = useSupabaseQuery(
    (supabase) => supabase.from('funcionarios').select('id, nome').eq('perfil', 'vendedor').eq('ativo', true),
    []
  )

  const { dados: regras, refetch: refetchRegras } = useSupabaseQuery(
    (supabase) => supabase.from('regras_comissao').select('*'),
    []
  )

  const {
    dados: comissoes,
    carregando: carregandoComissoes,
    refetch: refetchComissoes,
  } = useSupabaseQuery(
    (supabase) =>
      supabase
        .from('comissoes')
        .select('*, funcionarios(nome), ordens_servico(numero)')
        .gte('created_at', dataInicio)
        .lte('created_at', `${dataFim}T23:59:59`),
    [dataInicio, dataFim]
  )

  const relatorioPorVendedor = useMemo(() => {
    if (!comissoes) return []
    const grupos = {}
    for (const c of comissoes) {
      const chave = c.funcionario_id
      grupos[chave] ??= { nome: c.funcionarios?.nome, total: 0, pendente: 0, itens: [] }
      grupos[chave].total += Number(c.valor_calculado)
      if (c.status === 'pendente') grupos[chave].pendente += Number(c.valor_calculado)
      grupos[chave].itens.push(c)
    }
    return Object.entries(grupos).map(([funcionarioId, dados]) => ({ funcionarioId, ...dados }))
  }, [comissoes])

  async function fecharPeriodo() {
    setFechando(true)
    setMensagemFechamento(null)
    const { data, error } = await supabase.rpc('fechar_periodo_comissoes', {
      p_data_inicio: dataInicio,
      p_data_fim: dataFim,
    })
    setFechando(false)
    if (error) {
      setMensagemFechamento('Não foi possível fechar o período.')
      return
    }
    setMensagemFechamento(`${data} comissão(ões) calculada(s) e registrada(s).`)
    refetchComissoes()
  }

  async function marcarGrupoComoPago(itens) {
    const ids = itens.filter((i) => i.status === 'pendente').map((i) => i.id)
    if (ids.length === 0) return
    await supabase.from('comissoes').update({ status: 'pago' }).in('id', ids)
    refetchComissoes()
  }

  return (
    <div>
      <PageHeader titulo="Comissões" descricao="Regras por vendedor e fechamento de período" />

      <div className="mb-8">
        <h3 className="mb-3 text-sm font-medium text-gray-700">Regras por vendedor</h3>
        {carregandoVendedores && <Carregando />}
        <div className="space-y-2">
          {vendedores?.map((vendedor) => {
            const regra = regras?.find((r) => r.funcionario_id === vendedor.id)
            return (
              <div
                key={vendedor.id}
                className="flex items-center justify-between rounded-xl border border-gray-100 shadow-soft p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-gray-900">{vendedor.nome}</p>
                  <p className="text-gray-500">
                    {regra
                      ? OPCOES_TIPO_REGRA.find((o) => o.value === regra.tipo)?.label
                      : 'Nenhuma regra configurada'}
                  </p>
                </div>
                <Button variant="secondary" onClick={() => setVendedorConfigurando(vendedor)}>
                  Configurar
                </Button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mb-4">
        <h3 className="mb-3 text-sm font-medium text-gray-700">Fechamento de período</h3>
        <div className="flex flex-wrap items-end gap-3">
          <Input label="De" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          <Input label="Até" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          <Button loading={fechando} onClick={fecharPeriodo}>
            Fechar Período
          </Button>
        </div>
        {mensagemFechamento && <p className="mt-2 text-sm text-gray-600">{mensagemFechamento}</p>}
      </div>

      <h3 className="mb-3 text-sm font-medium text-gray-700">Relatório por vendedor</h3>
      {carregandoComissoes && <Carregando />}
      {!carregandoComissoes && relatorioPorVendedor.length === 0 && (
        <Vazio titulo="Nenhuma comissão no período selecionado" />
      )}
      <div className="space-y-2">
        {relatorioPorVendedor.map((grupo) => (
          <div key={grupo.funcionarioId} className="rounded-xl border border-gray-100 shadow-soft p-3 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-900">{grupo.nome}</p>
              <div className="flex items-center gap-3">
                <span className="text-gray-700">Total: {formatarMoeda(grupo.total)}</span>
                {grupo.pendente > 0 ? (
                  <Button variant="secondary" onClick={() => marcarGrupoComoPago(grupo.itens)}>
                    Marcar tudo como pago
                  </Button>
                ) : (
                  <Badge className="bg-green-100 text-green-700">Tudo pago</Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        aberto={Boolean(vendedorConfigurando)}
        onClose={() => setVendedorConfigurando(null)}
        titulo={`Regra de comissão — ${vendedorConfigurando?.nome ?? ''}`}
      >
        {vendedorConfigurando && (
          <FormularioRegraComissao
            vendedor={vendedorConfigurando}
            regraAtual={regras?.find((r) => r.funcionario_id === vendedorConfigurando.id)}
            onSalvo={() => {
              setVendedorConfigurando(null)
              refetchRegras()
            }}
            onCancelar={() => setVendedorConfigurando(null)}
          />
        )}
      </Modal>
    </div>
  )
}

function FormularioRegraComissao({ vendedor, regraAtual, onSalvo, onCancelar }) {
  const [tipo, setTipo] = useState(regraAtual?.tipo ?? 'percentual_fixo')
  const [percentualFixo, setPercentualFixo] = useState(regraAtual?.percentual_fixo ?? '5')
  const [valorFixo, setValorFixo] = useState(regraAtual?.valor_fixo ?? '0')
  const [percentualArmacao, setPercentualArmacao] = useState(regraAtual?.regras_categoria?.armacao ?? '5')
  const [percentualLente, setPercentualLente] = useState(regraAtual?.regras_categoria?.lente ?? '5')
  const [percentualAcessorio, setPercentualAcessorio] = useState(regraAtual?.regras_categoria?.acessorio ?? '5')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  async function salvar() {
    setErro(null)
    setSalvando(true)

    const payload = {
      funcionario_id: vendedor.id,
      tipo,
      percentual_fixo: tipo === 'percentual_fixo' ? Number(percentualFixo) : null,
      valor_fixo: tipo === 'valor_fixo' ? Number(valorFixo) : null,
      regras_categoria:
        tipo === 'percentual_categoria'
          ? {
              armacao: Number(percentualArmacao),
              lente: Number(percentualLente),
              acessorio: Number(percentualAcessorio),
            }
          : {},
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('regras_comissao').upsert(payload)
    setSalvando(false)

    if (error) {
      setErro('Não foi possível salvar a regra.')
      return
    }
    onSalvo()
  }

  return (
    <div className="space-y-3">
      <Select label="Tipo de comissão" value={tipo} onChange={(e) => setTipo(e.target.value)} options={OPCOES_TIPO_REGRA} />

      {tipo === 'percentual_fixo' && (
        <Input
          label="Percentual (%)"
          type="number"
          value={percentualFixo}
          onChange={(e) => setPercentualFixo(e.target.value)}
        />
      )}

      {tipo === 'valor_fixo' && (
        <Input label="Valor fixo por venda (R$)" type="number" value={valorFixo} onChange={(e) => setValorFixo(e.target.value)} />
      )}

      {tipo === 'percentual_categoria' && (
        <div className="grid grid-cols-3 gap-3">
          <Input label="Armação (%)" type="number" value={percentualArmacao} onChange={(e) => setPercentualArmacao(e.target.value)} />
          <Input label="Lente (%)" type="number" value={percentualLente} onChange={(e) => setPercentualLente(e.target.value)} />
          <Input label="Acessório (%)" type="number" value={percentualAcessorio} onChange={(e) => setPercentualAcessorio(e.target.value)} />
        </div>
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
