import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, SlidersHorizontal } from 'lucide-react'
import { PageHeader } from '../../../shared/components/PageHeader'
import { Button } from '../../../shared/components/Button'
import { Input } from '../../../shared/components/Input'
import { Select } from '../../../shared/components/Select'
import { Modal } from '../../../shared/components/Modal'
import { Carregando, Vazio } from '../../../shared/components/EstadoTela'
import { useSupabaseQuery } from '../../../shared/hooks/useSupabaseQuery'
import { useAuth } from '../../../shared/hooks/useAuth'
import { supabase } from '../../../shared/lib/supabaseClient'
import { enviarArquivo } from '../../../shared/lib/storage'
import { formatarMoeda, formatarData } from '../../../shared/utils/formatters'

const MOTIVOS_AJUSTE = [
  { value: 'quebra', label: 'Quebra' },
  { value: 'perda', label: 'Perda' },
  { value: 'correcao_inventario', label: 'Correção de inventário' },
  { value: 'devolucao', label: 'Devolução' },
  { value: 'outro', label: 'Outro' },
]

function useDebounce(valor, atrasoMs) {
  const [debounced, setDebounced] = useState(valor)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(valor), atrasoMs)
    return () => clearTimeout(timer)
  }, [valor, atrasoMs])
  return debounced
}

export default function Armacoes() {
  const { perfil } = useAuth()
  const [busca, setBusca] = useState('')
  const [marca, setMarca] = useState('')
  const [somenteEstoqueBaixo, setSomenteEstoqueBaixo] = useState(false)
  const [modalProdutoAberto, setModalProdutoAberto] = useState(false)
  const [produtoEditando, setProdutoEditando] = useState(null)
  const [modalAjusteAberto, setModalAjusteAberto] = useState(false)
  const [produtoAjustando, setProdutoAjustando] = useState(null)
  const [produtoExpandidoId, setProdutoExpandidoId] = useState(null)

  const buscaDebounced = useDebounce(busca, 300)

  const { dados: produtos, carregando, refetch } = useSupabaseQuery(
    (supabase) => {
      let query = supabase.from('produtos').select('*').eq('tipo', 'armacao').eq('ativo', true)
      if (buscaDebounced) {
        query = query.or(`sku.ilike.%${buscaDebounced}%,modelo.ilike.%${buscaDebounced}%`)
      }
      if (marca) query = query.eq('marca', marca)
      return query.order('marca')
    },
    [buscaDebounced, marca]
  )

  const produtosFiltrados = useMemo(() => {
    if (!produtos) return []
    if (!somenteEstoqueBaixo) return produtos
    return produtos.filter((p) => (p.estoque_atual ?? 0) <= (p.estoque_minimo ?? 3))
  }, [produtos, somenteEstoqueBaixo])

  const marcas = useMemo(() => {
    const unicas = new Set((produtos ?? []).map((p) => p.marca).filter(Boolean))
    return Array.from(unicas)
  }, [produtos])

  return (
    <div>
      <PageHeader
        titulo="Armações"
        descricao="Estoque de armações"
        acao={
          <Button
            onClick={() => {
              setProdutoEditando(null)
              setModalProdutoAberto(true)
            }}
          >
            <Plus size={16} />
            Novo Produto
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por SKU ou modelo"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <Select
          value={marca}
          onChange={(e) => setMarca(e.target.value)}
          options={[{ value: '', label: 'Todas as marcas' }, ...marcas.map((m) => ({ value: m, label: m }))]}
        />
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={somenteEstoqueBaixo}
            onChange={(e) => setSomenteEstoqueBaixo(e.target.checked)}
          />
          <SlidersHorizontal size={14} />
          Somente estoque baixo
        </label>
      </div>

      {carregando && <Carregando />}
      {!carregando && produtosFiltrados.length === 0 && (
        <Vazio titulo="Nenhuma armação encontrada" descricao="Cadastre o primeiro produto para começar." />
      )}

      <div className="space-y-2">
        {produtosFiltrados.map((produto) => {
          const estoqueBaixo = (produto.estoque_atual ?? 0) <= (produto.estoque_minimo ?? 3)
          const expandido = produtoExpandidoId === produto.id
          return (
            <div key={produto.id} className="rounded-xl border border-gray-100 shadow-soft">
              <div className="flex items-center justify-between p-3">
                <button
                  className="flex flex-1 items-center gap-3 text-left"
                  onClick={() => setProdutoExpandidoId(expandido ? null : produto.id)}
                >
                  {produto.foto_url ? (
                    <img src={produto.foto_url} alt={produto.modelo} className="h-10 w-10 rounded object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded bg-gray-100" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {[produto.marca, produto.modelo, produto.cor].filter(Boolean).join(' ')}
                    </p>
                    <p className="text-xs text-gray-500">SKU: {produto.sku ?? '—'}</p>
                  </div>
                </button>
                <div className="flex items-center gap-4 text-sm">
                  <span className={estoqueBaixo ? 'font-medium text-red-600' : 'text-gray-700'}>
                    Estoque: {produto.estoque_atual ?? 0}
                  </span>
                  <span className="text-gray-900">{formatarMoeda(produto.preco)}</span>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setProdutoAjustando(produto)
                      setModalAjusteAberto(true)
                    }}
                  >
                    Ajustar
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setProdutoEditando(produto)
                      setModalProdutoAberto(true)
                    }}
                  >
                    Editar
                  </Button>
                </div>
              </div>

              {expandido && <HistoricoMovimentos produtoId={produto.id} />}
            </div>
          )
        })}
      </div>

      <Modal
        aberto={modalProdutoAberto}
        onClose={() => setModalProdutoAberto(false)}
        titulo={produtoEditando ? 'Editar Armação' : 'Nova Armação'}
      >
        <FormularioProduto
          tipo="armacao"
          produto={produtoEditando}
          onSalvo={() => {
            setModalProdutoAberto(false)
            refetch()
          }}
          onCancelar={() => setModalProdutoAberto(false)}
        />
      </Modal>

      <Modal
        aberto={modalAjusteAberto}
        onClose={() => setModalAjusteAberto(false)}
        titulo={`Ajustar estoque — ${produtoAjustando ? [produtoAjustando.marca, produtoAjustando.modelo].filter(Boolean).join(' ') : ''}`}
      >
        {produtoAjustando && (
          <AjusteEstoqueForm
            produto={produtoAjustando}
            funcionarioId={perfil?.id}
            onSalvo={() => {
              setModalAjusteAberto(false)
              refetch()
            }}
            onCancelar={() => setModalAjusteAberto(false)}
          />
        )}
      </Modal>
    </div>
  )
}

export function FormularioProduto({ tipo, produto, onSalvo, onCancelar }) {
  const [marca, setMarca] = useState(produto?.marca ?? '')
  const [modelo, setModelo] = useState(produto?.modelo ?? '')
  const [cor, setCor] = useState(produto?.cor ?? '')
  const [material, setMaterial] = useState(produto?.material ?? '')
  const [sku, setSku] = useState(produto?.sku ?? '')
  const [custo, setCusto] = useState(produto?.custo ?? '0')
  const [preco, setPreco] = useState(produto?.preco ?? '0')
  const [estoqueInicial, setEstoqueInicial] = useState(produto?.estoque_atual ?? '0')
  const [estoqueMinimo, setEstoqueMinimo] = useState(produto?.estoque_minimo ?? '3')
  const [arquivoFoto, setArquivoFoto] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  async function salvar() {
    setErro(null)
    setSalvando(true)

    try {
      let fotoUrl = produto?.foto_url ?? null
      if (arquivoFoto) {
        fotoUrl = await enviarArquivo('produtos', produto?.id ?? crypto.randomUUID(), arquivoFoto)
      }

      const payload = {
        tipo,
        marca,
        modelo,
        cor,
        material,
        sku: sku || null,
        custo: Number(custo),
        preco: Number(preco),
        estoque_atual: Number(estoqueInicial),
        estoque_minimo: Number(estoqueMinimo),
        foto_url: fotoUrl,
      }

      if (produto) {
        const { error } = await supabase.from('produtos').update(payload).eq('id', produto.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('produtos').insert(payload)
        if (error) throw error
      }

      onSalvo()
    } catch (err) {
      setErro(err.code === '23505' ? 'Já existe um produto com este SKU.' : 'Não foi possível salvar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label="Marca" value={marca} onChange={(e) => setMarca(e.target.value)} />
        <Input label="Modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} />
        <Input label="Cor" value={cor} onChange={(e) => setCor(e.target.value)} />
        <Input label="Material" value={material} onChange={(e) => setMaterial(e.target.value)} />
        <Input label="SKU / código de barras" value={sku} onChange={(e) => setSku(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label="Custo (R$)" type="number" step="0.01" value={custo} onChange={(e) => setCusto(e.target.value)} />
        <Input label="Preço de venda (R$)" type="number" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} />
        <Input
          label="Quantidade em estoque"
          type="number"
          value={estoqueInicial}
          onChange={(e) => setEstoqueInicial(e.target.value)}
          disabled={Boolean(produto)}
        />
        <Input
          label="Estoque mínimo (alerta)"
          type="number"
          value={estoqueMinimo}
          onChange={(e) => setEstoqueMinimo(e.target.value)}
        />
      </div>

      <div>
        <label className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700">
          {arquivoFoto ? `Foto selecionada: ${arquivoFoto.name}` : 'Enviar foto'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setArquivoFoto(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {produto && (
        <p className="text-xs text-gray-400">
          A quantidade em estoque só muda pelo botão "Ajustar" (registra o motivo no histórico).
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

function AjusteEstoqueForm({ produto, funcionarioId, onSalvo, onCancelar }) {
  const [tipo, setTipo] = useState('entrada')
  const [quantidade, setQuantidade] = useState('1')
  const [motivo, setMotivo] = useState(MOTIVOS_AJUSTE[0].value)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  async function salvar() {
    setErro(null)
    if (Number(quantidade) <= 0) {
      setErro('Informe uma quantidade maior que zero.')
      return
    }
    setSalvando(true)
    const { error } = await supabase.rpc('ajustar_estoque', {
      p_produto_id: produto.id,
      p_tipo: tipo,
      p_quantidade: Number(quantidade),
      p_motivo: motivo,
      p_funcionario_id: funcionarioId ?? null,
    })
    setSalvando(false)
    if (error) {
      setErro('Não foi possível ajustar o estoque.')
      return
    }
    onSalvo()
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">Estoque atual: {produto.estoque_atual ?? 0}</p>
      <Select
        label="Tipo de ajuste"
        value={tipo}
        onChange={(e) => setTipo(e.target.value)}
        options={[
          { value: 'entrada', label: 'Entrada (+)' },
          { value: 'saida', label: 'Saída (-)' },
        ]}
      />
      <Input label="Quantidade" type="number" min={1} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
      <Select label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} options={MOTIVOS_AJUSTE} />
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button loading={salvando} onClick={salvar}>
          Confirmar
        </Button>
      </div>
    </div>
  )
}

function HistoricoMovimentos({ produtoId }) {
  const { dados: movimentos, carregando } = useSupabaseQuery(
    (supabase) =>
      supabase
        .from('estoque_movimentos')
        .select('*, funcionarios(nome)')
        .eq('produto_id', produtoId)
        .order('data', { ascending: false }),
    [produtoId]
  )

  return (
    <div className="border-t border-gray-100 p-3 text-sm">
      <p className="mb-2 font-medium text-gray-700">Histórico de movimentações</p>
      {carregando && <Carregando />}
      {!carregando && (!movimentos || movimentos.length === 0) && (
        <p className="text-gray-400">Nenhuma movimentação registrada.</p>
      )}
      <div className="space-y-1">
        {movimentos?.map((mov) => (
          <div key={mov.id} className="flex justify-between text-gray-600">
            <span>
              {mov.tipo === 'entrada' ? '+' : '-'}
              {mov.quantidade} · {mov.motivo}
            </span>
            <span className="text-gray-400">
              {formatarData(mov.data)} · {mov.funcionarios?.nome ?? '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
