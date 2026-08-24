import { useEffect, useState } from 'react'
import { PageHeader } from '../../../shared/components/PageHeader'
import { Button } from '../../../shared/components/Button'
import { Input } from '../../../shared/components/Input'
import { Select } from '../../../shared/components/Select'
import { Carregando } from '../../../shared/components/EstadoTela'
import { useSupabaseQuery } from '../../../shared/hooks/useSupabaseQuery'
import { supabase } from '../../../shared/lib/supabaseClient'
import { enviarArquivo } from '../../../shared/lib/storage'

const ABAS = [
  { chave: 'loja', label: 'Dados da Loja' },
  { chave: 'pagamento', label: 'Formas de Pagamento' },
  { chave: 'mensagens', label: 'Mensagens Automáticas' },
  { chave: 'estoque', label: 'Estoque' },
  { chave: 'comissao', label: 'Comissão Padrão' },
  { chave: 'permissoes', label: 'Usuários e Permissões' },
]

const FORMAS_PAGAMENTO = [
  { chave: 'pix', label: 'PIX' },
  { chave: 'cartao_credito', label: 'Cartão de crédito' },
  { chave: 'cartao_debito', label: 'Cartão de débito' },
  { chave: 'boleto', label: 'Boleto' },
]

const TIPOS_MENSAGEM = [
  { chave: 'os_pronta', label: 'Óculos pronto para retirada', variaveis: '{nome_cliente}, {numero_os}' },
  {
    chave: 'parcela_vencendo',
    label: 'Parcela vencendo em X dias',
    variaveis: '{nome_cliente}, {valor}, {data_vencimento}',
  },
  { chave: 'parcela_vencida', label: 'Parcela vencida', variaveis: '{nome_cliente}, {valor}, {data_vencimento}' },
  { chave: 'lembrete_troca', label: 'Lembrete de troca de óculos (marketing)', variaveis: '{nome_cliente}' },
]

const MATRIZ_PERMISSOES = [
  { modulo: 'Dashboard', admin: 'Total', vendedor: 'Visualizar', financeiro: 'Visualizar' },
  { modulo: 'Clientes & Receitas', admin: 'Total', vendedor: 'Editar', financeiro: 'Visualizar' },
  { modulo: 'Vendas / OS', admin: 'Total', vendedor: 'Editar', financeiro: 'Visualizar' },
  { modulo: 'Estoque', admin: 'Total', vendedor: 'Editar', financeiro: 'Visualizar' },
  { modulo: 'Financeiro', admin: 'Total', vendedor: 'Nenhum (exceto próprias comissões)', financeiro: 'Editar' },
  { modulo: 'Marketing', admin: 'Total', vendedor: 'Nenhum', financeiro: 'Nenhum' },
  { modulo: 'Funcionários', admin: 'Total', vendedor: 'Nenhum', financeiro: 'Nenhum' },
  { modulo: 'Configurações', admin: 'Total', vendedor: 'Nenhum', financeiro: 'Nenhum' },
]

export default function DadosLoja() {
  const [abaAtiva, setAbaAtiva] = useState('loja')

  const { dados: config, carregando, refetch } = useSupabaseQuery(
    (supabase) => supabase.from('configuracoes_loja').select('*').limit(1).maybeSingle(),
    []
  )

  return (
    <div>
      <PageHeader titulo="Configurações" descricao="Dados da loja e preferências do sistema" />

      <div className="mb-6 flex flex-wrap gap-1 border-b border-gray-200">
        {ABAS.map((aba) => (
          <button
            key={aba.chave}
            onClick={() => setAbaAtiva(aba.chave)}
            className={`px-4 py-2 text-sm font-medium ${
              abaAtiva === aba.chave
                ? 'border-b-2 border-blue-600 text-blue-700'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {aba.label}
          </button>
        ))}
      </div>

      {carregando && <Carregando />}

      {!carregando && config && (
        <>
          {abaAtiva === 'loja' && <AbaDadosLoja config={config} onSalvo={refetch} />}
          {abaAtiva === 'pagamento' && <AbaFormasPagamento config={config} onSalvo={refetch} />}
          {abaAtiva === 'mensagens' && <AbaMensagens config={config} onSalvo={refetch} />}
          {abaAtiva === 'estoque' && <AbaEstoque config={config} onSalvo={refetch} />}
          {abaAtiva === 'comissao' && <AbaComissaoPadrao config={config} onSalvo={refetch} />}
          {abaAtiva === 'permissoes' && <AbaPermissoes />}
        </>
      )}
    </div>
  )
}

function AbaDadosLoja({ config, onSalvo }) {
  const [nome, setNome] = useState(config.nome ?? '')
  const [cnpj, setCnpj] = useState(config.cnpj ?? '')
  const [endereco, setEndereco] = useState(config.endereco ?? '')
  const [telefone, setTelefone] = useState(config.telefone ?? '')
  const [email, setEmail] = useState(config.email ?? '')
  const [logoUrl, setLogoUrl] = useState(config.logo_url)
  const [arquivoLogo, setArquivoLogo] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  async function salvar() {
    setErro(null)
    setSalvando(true)
    try {
      let urlFinal = logoUrl
      if (arquivoLogo) {
        urlFinal = await enviarArquivo('loja', config.id, arquivoLogo)
      }
      const { error } = await supabase
        .from('configuracoes_loja')
        .update({ nome, cnpj, endereco, telefone, email, logo_url: urlFinal, updated_at: new Date().toISOString() })
        .eq('id', config.id)
      if (error) throw error
      onSalvo()
    } catch {
      setErro('Não foi possível salvar os dados da loja.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="max-w-lg space-y-3">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
          {(arquivoLogo && URL.createObjectURL(arquivoLogo)) || logoUrl ? (
            <img
              src={arquivoLogo ? URL.createObjectURL(arquivoLogo) : logoUrl}
              alt="Logo da loja"
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-xs text-gray-400">Sem logo</span>
          )}
        </div>
        <label className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700">
          Enviar logo
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setArquivoLogo(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <Input label="Nome da loja" value={nome} onChange={(e) => setNome(e.target.value)} />
      <Input label="CNPJ" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
      <Input label="Endereço completo" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
      <Input label="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
      <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <Button loading={salvando} onClick={salvar}>
        Salvar
      </Button>
    </div>
  )
}

function AbaFormasPagamento({ config, onSalvo }) {
  const [formas, setFormas] = useState(config.formas_pagamento_aceitas ?? [])
  const [parcelamentoMaximo, setParcelamentoMaximo] = useState(config.parcelamento_maximo ?? 1)
  const [salvando, setSalvando] = useState(false)

  function alternar(chave) {
    setFormas((atual) => (atual.includes(chave) ? atual.filter((f) => f !== chave) : [...atual, chave]))
  }

  async function salvar() {
    setSalvando(true)
    await supabase
      .from('configuracoes_loja')
      .update({
        formas_pagamento_aceitas: formas,
        parcelamento_maximo: Number(parcelamentoMaximo),
        updated_at: new Date().toISOString(),
      })
      .eq('id', config.id)
    setSalvando(false)
    onSalvo()
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="space-y-2">
        {FORMAS_PAGAMENTO.map((forma) => (
          <label key={forma.chave} className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={formas.includes(forma.chave)}
              onChange={() => alternar(forma.chave)}
            />
            {forma.label}
          </label>
        ))}
      </div>
      <Input
        label="Número máximo de parcelas"
        type="number"
        min={1}
        value={parcelamentoMaximo}
        onChange={(e) => setParcelamentoMaximo(e.target.value)}
      />
      <Button loading={salvando} onClick={salvar}>
        Salvar
      </Button>
    </div>
  )
}

function AbaMensagens({ config, onSalvo }) {
  const [mensagens, setMensagens] = useState(config.mensagens_automaticas ?? {})
  const [salvando, setSalvando] = useState(false)

  function atualizar(chave, campo, valor) {
    setMensagens((atual) => ({
      ...atual,
      [chave]: { ...(atual[chave] ?? { ativo: false, canal: 'whatsapp', template: '' }), [campo]: valor },
    }))
  }

  async function salvar() {
    setSalvando(true)
    await supabase
      .from('configuracoes_loja')
      .update({ mensagens_automaticas: mensagens, updated_at: new Date().toISOString() })
      .eq('id', config.id)
    setSalvando(false)
    onSalvo()
  }

  return (
    <div className="max-w-2xl space-y-4">
      {TIPOS_MENSAGEM.map((tipo) => {
        const item = mensagens[tipo.chave] ?? { ativo: false, canal: 'whatsapp', template: '' }
        return (
          <div key={tipo.chave} className="rounded-xl border border-gray-100 shadow-soft p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-gray-800">{tipo.label}</p>
              <label className="flex items-center gap-2 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={item.ativo}
                  onChange={(e) => atualizar(tipo.chave, 'ativo', e.target.checked)}
                />
                Ativa
              </label>
            </div>
            <Select
              label="Canal padrão"
              value={item.canal}
              onChange={(e) => atualizar(tipo.chave, 'canal', e.target.value)}
              options={[
                { value: 'whatsapp', label: 'WhatsApp' },
                { value: 'email', label: 'E-mail' },
              ]}
              className="mb-2"
            />
            <textarea
              value={item.template}
              onChange={(e) => atualizar(tipo.chave, 'template', e.target.value)}
              rows={2}
              placeholder={`Variáveis disponíveis: ${tipo.variaveis}`}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-400">Variáveis: {tipo.variaveis}</p>
          </div>
        )
      })}
      <Button loading={salvando} onClick={salvar}>
        Salvar
      </Button>
    </div>
  )
}

function AbaEstoque({ config, onSalvo }) {
  const [estoqueMinimoPadrao, setEstoqueMinimoPadrao] = useState(config.estoque_minimo_padrao ?? 3)
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    setSalvando(true)
    await supabase
      .from('configuracoes_loja')
      .update({ estoque_minimo_padrao: Number(estoqueMinimoPadrao), updated_at: new Date().toISOString() })
      .eq('id', config.id)
    setSalvando(false)
    onSalvo()
  }

  return (
    <div className="max-w-sm space-y-4">
      <Input
        label="Estoque mínimo padrão (usado quando o produto não tem valor próprio)"
        type="number"
        min={0}
        value={estoqueMinimoPadrao}
        onChange={(e) => setEstoqueMinimoPadrao(e.target.value)}
      />
      <Button loading={salvando} onClick={salvar}>
        Salvar
      </Button>
    </div>
  )
}

function AbaComissaoPadrao({ config, onSalvo }) {
  const [tipo, setTipo] = useState(config.comissao_padrao?.tipo ?? 'percentual_fixo')
  const [percentualFixo, setPercentualFixo] = useState(config.comissao_padrao?.percentual_fixo ?? 5)
  const [valorFixo, setValorFixo] = useState(config.comissao_padrao?.valor_fixo ?? 0)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    setTipo(config.comissao_padrao?.tipo ?? 'percentual_fixo')
    setPercentualFixo(config.comissao_padrao?.percentual_fixo ?? 5)
    setValorFixo(config.comissao_padrao?.valor_fixo ?? 0)
  }, [config])

  async function salvar() {
    setSalvando(true)
    const comissaoPadrao =
      tipo === 'valor_fixo'
        ? { tipo, valor_fixo: Number(valorFixo) }
        : { tipo, percentual_fixo: Number(percentualFixo) }

    await supabase
      .from('configuracoes_loja')
      .update({ comissao_padrao: comissaoPadrao, updated_at: new Date().toISOString() })
      .eq('id', config.id)
    setSalvando(false)
    onSalvo()
  }

  return (
    <div className="max-w-sm space-y-4">
      <p className="text-sm text-gray-500">
        Regra aplicada a novos vendedores por padrão. Pode ser sobrescrita individualmente na tela de
        Funcionários → Comissões.
      </p>
      <Select
        label="Tipo"
        value={tipo}
        onChange={(e) => setTipo(e.target.value)}
        options={[
          { value: 'percentual_fixo', label: 'Percentual fixo sobre a venda' },
          { value: 'valor_fixo', label: 'Valor fixo por venda' },
        ]}
      />
      {tipo === 'percentual_fixo' ? (
        <Input label="Percentual (%)" type="number" value={percentualFixo} onChange={(e) => setPercentualFixo(e.target.value)} />
      ) : (
        <Input label="Valor fixo (R$)" type="number" value={valorFixo} onChange={(e) => setValorFixo(e.target.value)} />
      )}
      <Button loading={salvando} onClick={salvar}>
        Salvar
      </Button>
    </div>
  )
}

function AbaPermissoes() {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-soft">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Módulo</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Admin</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Vendedor</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Financeiro</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {MATRIZ_PERMISSOES.map((linha) => (
            <tr key={linha.modulo}>
              <td className="px-4 py-3 font-medium text-gray-900">{linha.modulo}</td>
              <td className="px-4 py-3 text-gray-700">{linha.admin}</td>
              <td className="px-4 py-3 text-gray-700">{linha.vendedor}</td>
              <td className="px-4 py-3 text-gray-700">{linha.financeiro}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
