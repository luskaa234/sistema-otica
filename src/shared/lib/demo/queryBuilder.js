// Réplica mínima (mas suficiente para este app) da API encadeável do
// supabase-js (`.from(tabela).select().eq()...`), operando sobre os dados
// em memória de seedData.js. Implementa só os operadores realmente usados
// no código: eq, neq, gte, lte, ilike, or, in, not, order, limit, single,
// maybeSingle, insert, update, upsert.
import { db, gerarId } from './seedData'

const RELACOES = {
  ordens_servico: {
    clientes: { fk: 'cliente_id', para: 'clientes' },
  },
  os_itens: {
    produtos: { fk: 'produto_id', para: 'produtos' },
  },
  os_status_historico: {
    funcionarios: { fk: 'funcionario_id', para: 'funcionarios' },
  },
  pedidos_lente: {
    produtos: { fk: 'produto_id', para: 'produtos' },
    fornecedores: { fk: 'fornecedor_id', para: 'fornecedores' },
    ordens_servico: { fk: 'os_id', para: 'ordens_servico' },
  },
  pagamentos: {
    ordens_servico: { fk: 'os_id', para: 'ordens_servico' },
  },
  contas_pagar: {
    fornecedores: { fk: 'fornecedor_id', para: 'fornecedores' },
  },
  estoque_movimentos: {
    funcionarios: { fk: 'funcionario_id', para: 'funcionarios' },
  },
  comissoes: {
    funcionarios: { fk: 'funcionario_id', para: 'funcionarios' },
    ordens_servico: { fk: 'os_id', para: 'ordens_servico' },
  },
  logs_auditoria: {
    funcionarios: { fk: 'funcionario_id', para: 'funcionarios' },
  },
}

function ilikeParaRegex(padrao) {
  const escapado = String(padrao).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*')
  return new RegExp(`^${escapado}$`, 'i')
}

function parseOrExpr(expr) {
  return expr.split(',').map((pedaco) => {
    const [col, op, ...resto] = pedaco.split('.')
    return { col, op, valor: resto.join('.') }
  })
}

function avaliarCondicao(row, col, op, valor) {
  if (op === 'ilike') return ilikeParaRegex(valor).test(row[col] ?? '')
  if (op === 'eq') return String(row[col]) === String(valor === 'true' ? true : valor === 'false' ? false : valor)
  return false
}

function clonar(obj) {
  return obj === null || obj === undefined ? obj : JSON.parse(JSON.stringify(obj))
}

function embedRelacoes(row, tabela, profundidade = 0) {
  if (!row || profundidade > 3) return row
  const relacoes = RELACOES[tabela]
  const linha = clonar(row)
  if (!relacoes) return linha

  for (const [alias, { fk, para }] of Object.entries(relacoes)) {
    const idRelacionado = row[fk]
    const relacionado = idRelacionado ? db[para]?.find((r) => r.id === idRelacionado) : null
    linha[alias] = relacionado ? embedRelacoes(relacionado, para, profundidade + 1) : null
  }
  return linha
}

class DemoQueryBuilder {
  constructor(tabela) {
    this.tabela = tabela
    this.filtros = []
    this.ordemCol = null
    this.ordemAsc = true
    this.limitN = null
    this.singleModo = null
    this.operacao = null
  }

  select() {
    return this
  }

  eq(col, valor) {
    this.filtros.push((row) => row[col] === valor)
    return this
  }

  neq(col, valor) {
    this.filtros.push((row) => row[col] !== valor)
    return this
  }

  gte(col, valor) {
    this.filtros.push((row) => row[col] != null && row[col] >= valor)
    return this
  }

  lte(col, valor) {
    this.filtros.push((row) => row[col] != null && row[col] <= valor)
    return this
  }

  ilike(col, padrao) {
    const regex = ilikeParaRegex(padrao)
    this.filtros.push((row) => regex.test(row[col] ?? ''))
    return this
  }

  in(col, arr) {
    this.filtros.push((row) => arr.includes(row[col]))
    return this
  }

  not(col, _op, valorLista) {
    const itens = String(valorLista).replace(/^\(|\)$/g, '').split(',')
    this.filtros.push((row) => !itens.includes(row[col]))
    return this
  }

  or(expr) {
    const condicoes = parseOrExpr(expr)
    this.filtros.push((row) => condicoes.some((c) => avaliarCondicao(row, c.col, c.op, c.valor)))
    return this
  }

  order(col, opts) {
    this.ordemCol = col
    this.ordemAsc = !(opts?.ascending === false)
    return this
  }

  limit(n) {
    this.limitN = n
    return this
  }

  single() {
    this.singleModo = 'single'
    return this
  }

  maybeSingle() {
    this.singleModo = 'maybeSingle'
    return this
  }

  insert(payload) {
    this.operacao = { tipo: 'insert', payload }
    return this
  }

  update(payload) {
    this.operacao = { tipo: 'update', payload }
    return this
  }

  upsert(payload) {
    this.operacao = { tipo: 'upsert', payload }
    return this
  }

  _linhasFiltradas() {
    const tabela = db[this.tabela] ?? []
    return tabela.filter((row) => this.filtros.every((f) => f(row)))
  }

  _executar() {
    if (!db[this.tabela]) {
      return { data: null, error: { message: `Tabela demo desconhecida: ${this.tabela}` } }
    }

    if (this.operacao?.tipo === 'insert') {
      const payloads = Array.isArray(this.operacao.payload) ? this.operacao.payload : [this.operacao.payload]
      const novasLinhas = payloads.map((p) => ({
        id: gerarId(this.tabela),
        created_at: new Date().toISOString(),
        ...p,
      }))
      db[this.tabela].push(...novasLinhas)
      return this._finalizar(novasLinhas)
    }

    if (this.operacao?.tipo === 'update') {
      const alvos = this._linhasFiltradas()
      alvos.forEach((row) => Object.assign(row, this.operacao.payload))
      return this._finalizar(alvos)
    }

    if (this.operacao?.tipo === 'upsert') {
      const payloads = Array.isArray(this.operacao.payload) ? this.operacao.payload : [this.operacao.payload]
      const chavePrimaria = this.tabela === 'regras_comissao' ? 'funcionario_id' : 'id'
      const resultado = payloads.map((p) => {
        const existente = db[this.tabela].find((row) => row[chavePrimaria] === p[chavePrimaria])
        if (existente) {
          Object.assign(existente, p)
          return existente
        }
        const nova = { id: gerarId(this.tabela), created_at: new Date().toISOString(), ...p }
        db[this.tabela].push(nova)
        return nova
      })
      return this._finalizar(resultado)
    }

    let linhas = this._linhasFiltradas()

    if (this.ordemCol) {
      linhas = [...linhas].sort((a, b) => {
        const va = a[this.ordemCol]
        const vb = b[this.ordemCol]
        if (va === vb) return 0
        const cmp = va > vb ? 1 : -1
        return this.ordemAsc ? cmp : -cmp
      })
    }

    if (this.limitN != null) linhas = linhas.slice(0, this.limitN)

    return this._finalizar(linhas)
  }

  _finalizar(linhas) {
    const comRelacoes = linhas.map((row) => embedRelacoes(row, this.tabela))

    if (this.singleModo === 'single') {
      if (comRelacoes.length === 0) {
        return { data: null, error: { message: 'Nenhum registro encontrado.' } }
      }
      return { data: comRelacoes[0], error: null }
    }

    if (this.singleModo === 'maybeSingle') {
      return { data: comRelacoes[0] ?? null, error: null }
    }

    return { data: comRelacoes, error: null }
  }

  then(resolve, reject) {
    try {
      resolve(this._executar())
    } catch (erro) {
      if (reject) reject(erro)
      else throw erro
    }
  }
}

export function criarQueryBuilder(tabela) {
  return new DemoQueryBuilder(tabela)
}
