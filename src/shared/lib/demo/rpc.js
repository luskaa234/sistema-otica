// Réplica em JS das funções SQL (RPC) do banco real, operando sobre os
// dados em memória. Cada função aqui espelha o comportamento da migration
// correspondente em supabase/migrations/.
import { db, gerarId, proximoNumeroOS } from './seedData'

class RpcResult {
  constructor(data) {
    this.data = data
    this.error = null
  }

  single() {
    this.data = Array.isArray(this.data) ? (this.data[0] ?? null) : this.data
    return this
  }

  maybeSingle() {
    this.data = Array.isArray(this.data) ? (this.data[0] ?? null) : this.data
    return this
  }

  then(resolve, reject) {
    try {
      resolve({ data: this.data, error: this.error })
    } catch (erro) {
      if (reject) reject(erro)
      else throw erro
    }
  }
}

function nomeCliente(id) {
  return db.clientes.find((c) => c.id === id)?.nome ?? null
}

function nomeFuncionario(id) {
  return db.funcionarios.find((f) => f.id === id)?.nome ?? null
}

function listar_clientes_resumo(params) {
  const { p_busca, p_ativo, p_tem_receita, p_ordenar, p_limit = 25, p_offset = 0 } = params

  let linhas = db.clientes.map((cliente) => {
    const osDoCliente = db.ordens_servico.filter((os) => os.cliente_id === cliente.id && os.status !== 'cancelado')
    const totalGasto = osDoCliente.reduce((soma, os) => soma + Number(os.valor_total) - Number(os.desconto ?? 0), 0)
    const ultimaCompra = osDoCliente.reduce((max, os) => (!max || os.created_at > max ? os.created_at : max), null)
    const temReceitaAtiva = db.receitas.some((r) => r.cliente_id === cliente.id && r.ativa)

    return {
      id: cliente.id,
      nome: cliente.nome,
      cpf: cliente.cpf,
      telefone: cliente.telefone,
      email: cliente.email,
      foto_url: cliente.foto_url,
      ativo: cliente.ativo,
      created_at: cliente.created_at,
      total_gasto: totalGasto,
      ultima_compra: ultimaCompra,
      tem_receita_ativa: temReceitaAtiva,
    }
  })

  if (p_busca) {
    const termo = p_busca.toLowerCase()
    linhas = linhas.filter(
      (c) => c.nome.toLowerCase().includes(termo) || c.cpf.includes(termo) || (c.telefone ?? '').includes(termo)
    )
  }
  if (p_ativo !== null && p_ativo !== undefined) linhas = linhas.filter((c) => c.ativo === p_ativo)
  if (p_tem_receita !== null && p_tem_receita !== undefined) {
    linhas = linhas.filter((c) => c.tem_receita_ativa === p_tem_receita)
  }

  if (p_ordenar === 'ultima_compra') {
    linhas.sort((a, b) => (b.ultima_compra ?? '').localeCompare(a.ultima_compra ?? ''))
  } else {
    linhas.sort((a, b) => a.nome.localeCompare(b.nome))
  }

  const total = linhas.length
  linhas = linhas.slice(p_offset, p_offset + p_limit).map((l) => ({ ...l, total_registros: total }))

  return new RpcResult(linhas)
}

function listar_ordens_servico(params) {
  const {
    p_status,
    p_busca,
    p_vendedor_id,
    p_data_inicio,
    p_data_fim,
    p_limit = 25,
    p_offset = 0,
  } = params

  let linhas = db.ordens_servico.map((os) => ({
    id: os.id,
    numero: os.numero,
    cliente_id: os.cliente_id,
    cliente_nome: nomeCliente(os.cliente_id),
    vendedor_id: os.vendedor_id,
    vendedor_nome: nomeFuncionario(os.vendedor_id),
    status: os.status,
    valor_total: os.valor_total,
    desconto: os.desconto,
    prazo_entrega: os.prazo_entrega,
    created_at: os.created_at,
  }))

  if (p_status && p_status !== 'todos') linhas = linhas.filter((l) => l.status === p_status)
  if (p_vendedor_id) linhas = linhas.filter((l) => l.vendedor_id === p_vendedor_id)
  if (p_data_inicio) linhas = linhas.filter((l) => l.created_at.slice(0, 10) >= p_data_inicio)
  if (p_data_fim) linhas = linhas.filter((l) => l.created_at.slice(0, 10) <= p_data_fim)
  if (p_busca) {
    const termo = p_busca.toLowerCase()
    linhas = linhas.filter(
      (l) => (l.cliente_nome ?? '').toLowerCase().includes(termo) || String(l.numero) === p_busca
    )
  }

  linhas.sort((a, b) => b.created_at.localeCompare(a.created_at))

  const total = linhas.length
  linhas = linhas.slice(p_offset, p_offset + p_limit).map((l) => ({ ...l, total_registros: total }))

  return new RpcResult(linhas)
}

function criar_ordem_servico(params) {
  const {
    p_cliente_id,
    p_receita_id,
    p_vendedor_id,
    p_status,
    p_valor_total,
    p_desconto,
    p_motivo_desconto,
    p_forma_pagamento,
    p_prazo_entrega,
    p_itens,
  } = params

  const agora = new Date().toISOString()
  const osId = gerarId('os')

  db.ordens_servico.push({
    id: osId,
    numero: proximoNumeroOS(),
    cliente_id: p_cliente_id,
    receita_id: p_receita_id,
    vendedor_id: p_vendedor_id,
    status: p_status,
    valor_total: p_valor_total,
    desconto: p_desconto,
    motivo_desconto: p_motivo_desconto,
    forma_pagamento: p_forma_pagamento,
    prazo_entrega: p_prazo_entrega,
    motivo_cancelamento: null,
    created_at: agora,
    updated_at: agora,
  })

  for (const item of p_itens) {
    db.os_itens.push({
      id: gerarId('item'),
      os_id: osId,
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario,
    })
  }

  db.os_status_historico.push({
    id: gerarId('hist'),
    os_id: osId,
    status_anterior: null,
    status_novo: p_status,
    funcionario_id: p_vendedor_id,
    motivo: null,
    created_at: agora,
  })

  gerarPedidosLenteSeAprovado(osId, p_status, null)

  if (p_vendedor_id) {
    db.logs_auditoria.push({
      id: gerarId('log'),
      funcionario_id: p_vendedor_id,
      acao: 'criar_os',
      tabela_afetada: 'ordens_servico',
      registro_id: osId,
      detalhes: { status: p_status },
      created_at: agora,
    })
  }

  return new RpcResult(osId)
}

function gerarPedidosLenteSeAprovado(osId, novoStatus, statusAnterior) {
  if (novoStatus !== 'aprovado' || statusAnterior === 'aprovado') return

  const itensDaOS = db.os_itens.filter((item) => item.os_id === osId)
  for (const item of itensDaOS) {
    const produto = db.produtos.find((p) => p.id === item.produto_id)
    if (!produto || produto.tipo !== 'lente') continue

    const jaExiste = db.pedidos_lente.some((pl) => pl.os_id === osId && pl.produto_id === item.produto_id)
    if (jaExiste) continue

    const prazo = produto.prazo_dias
      ? new Date(Date.now() + produto.prazo_dias * 86400000).toISOString().slice(0, 10)
      : null

    db.pedidos_lente.push({
      id: gerarId('pl'),
      os_id: osId,
      produto_id: item.produto_id,
      fornecedor_id: produto.fornecedor_id,
      status: 'pedido_enviado',
      prazo_estimado: prazo,
      data_recebimento: null,
      created_at: new Date().toISOString(),
    })
  }
}

function avancar_status_os(params) {
  const { p_os_id, p_novo_status, p_funcionario_id, p_motivo } = params
  const os = db.ordens_servico.find((o) => o.id === p_os_id)
  if (!os) return new RpcResult(null)

  const statusAnterior = os.status
  os.status = p_novo_status
  os.updated_at = new Date().toISOString()
  if (p_novo_status === 'cancelado') os.motivo_cancelamento = p_motivo ?? null

  db.os_status_historico.push({
    id: gerarId('hist'),
    os_id: p_os_id,
    status_anterior: statusAnterior,
    status_novo: p_novo_status,
    funcionario_id: p_funcionario_id,
    motivo: p_motivo ?? null,
    created_at: new Date().toISOString(),
  })

  if (p_funcionario_id) {
    db.logs_auditoria.push({
      id: gerarId('log'),
      funcionario_id: p_funcionario_id,
      acao: 'alterar_status_os',
      tabela_afetada: 'ordens_servico',
      registro_id: p_os_id,
      detalhes: { de: statusAnterior, para: p_novo_status, motivo: p_motivo ?? null },
      created_at: new Date().toISOString(),
    })
  }

  gerarPedidosLenteSeAprovado(p_os_id, p_novo_status, statusAnterior)

  return new RpcResult(null)
}

function ajustar_estoque(params) {
  const { p_produto_id, p_tipo, p_quantidade, p_motivo, p_funcionario_id } = params
  const produto = db.produtos.find((p) => p.id === p_produto_id)
  if (produto) {
    produto.estoque_atual = (produto.estoque_atual ?? 0) + (p_tipo === 'entrada' ? p_quantidade : -p_quantidade)
  }

  db.estoque_movimentos.push({
    id: gerarId('mov'),
    produto_id: p_produto_id,
    tipo: p_tipo,
    quantidade: p_quantidade,
    motivo: p_motivo,
    funcionario_id: p_funcionario_id,
    data: new Date().toISOString(),
  })

  return new RpcResult(null)
}

function fechar_periodo_comissoes(params) {
  const { p_data_inicio, p_data_fim } = params
  let contador = 0

  const osElegiveis = db.ordens_servico.filter(
    (os) =>
      os.status !== 'orcamento' &&
      os.status !== 'cancelado' &&
      os.vendedor_id &&
      os.created_at.slice(0, 10) >= p_data_inicio &&
      os.created_at.slice(0, 10) <= p_data_fim &&
      !db.comissoes.some((c) => c.os_id === os.id)
  )

  for (const os of osElegiveis) {
    const regra = db.regras_comissao.find((r) => r.funcionario_id === os.vendedor_id)
    if (!regra) continue

    let valor
    let tipo
    if (regra.tipo === 'valor_fixo') {
      valor = Number(regra.valor_fixo ?? 0)
      tipo = 'valor_fixo'
    } else if (regra.tipo === 'percentual_categoria') {
      const itens = db.os_itens.filter((i) => i.os_id === os.id)
      valor = itens.reduce((soma, item) => {
        const produto = db.produtos.find((p) => p.id === item.produto_id)
        const percentual = Number(regra.regras_categoria?.[produto?.tipo] ?? 0)
        return soma + item.valor_unitario * item.quantidade * (percentual / 100)
      }, 0)
      tipo = 'percentual'
    } else {
      valor = (Number(os.valor_total) - Number(os.desconto ?? 0)) * (Number(regra.percentual_fixo ?? 0) / 100)
      tipo = 'percentual'
    }

    db.comissoes.push({
      id: gerarId('com'),
      funcionario_id: os.vendedor_id,
      os_id: os.id,
      percentual_ou_valor: regra.percentual_fixo ?? regra.valor_fixo ?? 0,
      tipo,
      valor_calculado: valor,
      status: 'pendente',
      created_at: new Date().toISOString(),
    })
    contador += 1
  }

  return new RpcResult(contador)
}

function resumo_vendas_periodo(params) {
  const { p_data_inicio, p_data_fim } = params

  const osNoPeriodo = db.ordens_servico.filter(
    (os) => os.created_at.slice(0, 10) >= p_data_inicio && os.created_at.slice(0, 10) <= p_data_fim
  )
  const vendas = osNoPeriodo.filter((os) => os.status !== 'orcamento' && os.status !== 'cancelado')
  const totalVendido = vendas.reduce((soma, os) => soma + Number(os.valor_total) - Number(os.desconto ?? 0), 0)
  const qtdVendas = vendas.length
  const qtdOrcamentos = osNoPeriodo.length

  return new RpcResult({
    total_vendido: totalVendido,
    qtd_vendas: qtdVendas,
    ticket_medio: qtdVendas > 0 ? totalVendido / qtdVendas : 0,
    qtd_orcamentos: qtdOrcamentos,
    taxa_conversao: qtdOrcamentos > 0 ? Math.round((qtdVendas / qtdOrcamentos) * 1000) / 10 : 0,
  })
}

function produtos_mais_vendidos(params) {
  const { p_data_inicio, p_data_fim, p_limit = 5 } = params

  const osValidas = new Set(
    db.ordens_servico
      .filter(
        (os) =>
          os.status !== 'cancelado' &&
          os.created_at.slice(0, 10) >= p_data_inicio &&
          os.created_at.slice(0, 10) <= p_data_fim
      )
      .map((os) => os.id)
  )

  const agregados = new Map()
  for (const item of db.os_itens) {
    if (!osValidas.has(item.os_id)) continue
    const produto = db.produtos.find((p) => p.id === item.produto_id)
    if (!produto) continue

    const atual = agregados.get(produto.id) ?? {
      produto_id: produto.id,
      marca: produto.marca,
      modelo: produto.modelo,
      tipo: produto.tipo,
      quantidade_vendida: 0,
      valor_total: 0,
    }
    atual.quantidade_vendida += item.quantidade
    atual.valor_total += item.quantidade * item.valor_unitario
    agregados.set(produto.id, atual)
  }

  const linhas = Array.from(agregados.values())
    .sort((a, b) => b.quantidade_vendida - a.quantidade_vendida)
    .slice(0, p_limit)

  return new RpcResult(linhas)
}

function vendas_por_vendedor(params) {
  const { p_data_inicio, p_data_fim } = params

  const linhas = db.funcionarios
    .filter((f) => f.perfil === 'vendedor')
    .map((vendedor) => {
      const osDoVendedor = db.ordens_servico.filter(
        (os) =>
          os.vendedor_id === vendedor.id &&
          os.status !== 'orcamento' &&
          os.status !== 'cancelado' &&
          os.created_at.slice(0, 10) >= p_data_inicio &&
          os.created_at.slice(0, 10) <= p_data_fim
      )
      return {
        funcionario_id: vendedor.id,
        nome: vendedor.nome,
        quantidade_vendas: osDoVendedor.length,
        valor_total: osDoVendedor.reduce((soma, os) => soma + Number(os.valor_total) - Number(os.desconto ?? 0), 0),
      }
    })
    .sort((a, b) => b.valor_total - a.valor_total)

  return new RpcResult(linhas)
}

function calcular_destinatarios_campanha(params) {
  const { p_segmento, p_inatividade_meses, p_clientes_selecionados } = params

  const limiteInatividade = new Date()
  limiteInatividade.setMonth(limiteInatividade.getMonth() - (p_inatividade_meses ?? 6))

  const limiteReceita = new Date()
  limiteReceita.setFullYear(limiteReceita.getFullYear() - 1)

  const linhas = db.clientes
    .filter((cliente) => {
      if (!cliente.ativo) return false
      if (p_segmento === 'todos') return true
      if (p_segmento === 'manual') return (p_clientes_selecionados ?? []).includes(cliente.id)

      if (p_segmento === 'inativos') {
        const osDoCliente = db.ordens_servico.filter((os) => os.cliente_id === cliente.id && os.status !== 'cancelado')
        const ultima = osDoCliente.reduce((max, os) => (!max || os.created_at > max ? os.created_at : max), null)
        return !ultima || new Date(ultima) < limiteInatividade
      }

      if (p_segmento === 'receita_vencida') {
        const receitasDoCliente = db.receitas.filter((r) => r.cliente_id === cliente.id)
        const ultima = receitasDoCliente.reduce((max, r) => (!max || r.created_at > max ? r.created_at : max), null)
        return !ultima || new Date(ultima) < limiteReceita
      }

      return false
    })
    .map((cliente) => {
      const osDoCliente = db.ordens_servico.filter((os) => os.cliente_id === cliente.id && os.status !== 'cancelado')
      const ultimaCompra = osDoCliente.reduce((max, os) => (!max || os.created_at > max ? os.created_at : max), null)
      return {
        cliente_id: cliente.id,
        nome: cliente.nome,
        telefone: cliente.telefone,
        email: cliente.email,
        ultima_compra: ultimaCompra ? ultimaCompra.slice(0, 10) : null,
      }
    })

  return new RpcResult(linhas)
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

function dashboard_indicadores() {
  const hoje = hojeISO()
  const inicioMes = hoje.slice(0, 8) + '01'
  const dataRef = new Date()
  const inicioMesAnterior = new Date(dataRef.getFullYear(), dataRef.getMonth() - 1, 1).toISOString().slice(0, 10)

  const vendasValidas = (os) => os.status !== 'orcamento' && os.status !== 'cancelado'
  const liquido = (os) => Number(os.valor_total) - Number(os.desconto ?? 0)

  const vendasHoje = db.ordens_servico.filter((os) => vendasValidas(os) && os.created_at.slice(0, 10) === hoje)
  const vendasMes = db.ordens_servico.filter((os) => vendasValidas(os) && os.created_at.slice(0, 10) >= inicioMes)
  const vendasMesAnterior = db.ordens_servico.filter(
    (os) => vendasValidas(os) && os.created_at.slice(0, 10) >= inicioMesAnterior && os.created_at.slice(0, 10) < inicioMes
  )

  const em7Dias = new Date()
  em7Dias.setDate(em7Dias.getDate() + 7)
  const em7DiasISO = em7Dias.toISOString().slice(0, 10)

  const contasReceber7 = db.pagamentos
    .filter((p) => ['PENDING', 'OVERDUE'].includes(p.status) && p.data_vencimento && p.data_vencimento <= em7DiasISO)
    .reduce((soma, p) => soma + Number(p.valor), 0)

  const contasPagar7 = db.contas_pagar
    .filter((c) => c.status === 'pendente' && c.data_vencimento <= em7DiasISO)
    .reduce((soma, c) => soma + Number(c.valor), 0)

  const estoqueBaixo = db.produtos.filter(
    (p) => p.ativo && ['armacao', 'acessorio'].includes(p.tipo) && (p.estoque_atual ?? 0) <= (p.estoque_minimo ?? 3)
  ).length

  return new RpcResult({
    vendas_dia_valor: vendasHoje.reduce((s, os) => s + liquido(os), 0),
    vendas_dia_qtd: vendasHoje.length,
    vendas_mes_valor: vendasMes.reduce((s, os) => s + liquido(os), 0),
    vendas_mes_anterior_valor: vendasMesAnterior.reduce((s, os) => s + liquido(os), 0),
    os_orcamento: db.ordens_servico.filter((os) => os.status === 'orcamento').length,
    os_em_producao: db.ordens_servico.filter((os) => os.status === 'em_producao').length,
    os_pronto: db.ordens_servico.filter((os) => os.status === 'pronto').length,
    contas_receber_7dias: contasReceber7,
    contas_pagar_7dias: contasPagar7,
    estoque_baixo_qtd: estoqueBaixo,
  })
}

function dashboard_acao_necessaria() {
  const hoje = hojeISO()
  const linhas = []

  for (const os of db.ordens_servico) {
    if (['entregue', 'cancelado'].includes(os.status)) continue
    if (os.prazo_entrega && os.prazo_entrega <= hoje) {
      linhas.push({
        tipo: 'os_atrasada',
        titulo: `OS #${os.numero} atrasada`,
        subtitulo: nomeCliente(os.cliente_id),
        referencia_id: os.id,
        data: os.prazo_entrega,
      })
    }
  }

  for (const pagamento of db.pagamentos) {
    if (pagamento.status === 'OVERDUE' && !pagamento.lembrete_enviado_em) {
      const os = db.ordens_servico.find((o) => o.id === pagamento.os_id)
      linhas.push({
        tipo: 'pagamento_vencido',
        titulo: `Pagamento vencido — OS #${os?.numero ?? '?'}`,
        subtitulo: os ? nomeCliente(os.cliente_id) : null,
        referencia_id: pagamento.id,
        data: pagamento.data_vencimento,
      })
    }
  }

  for (const pedido of db.pedidos_lente) {
    if (pedido.status !== 'recebido' && pedido.prazo_estimado && pedido.prazo_estimado < hoje) {
      const os = db.ordens_servico.find((o) => o.id === pedido.os_id)
      const produto = db.produtos.find((p) => p.id === pedido.produto_id)
      linhas.push({
        tipo: 'lente_atrasada',
        titulo: `Lente atrasada — OS #${os?.numero ?? '?'}`,
        subtitulo: produto ? `${produto.marca} ${produto.modelo}` : null,
        referencia_id: pedido.id,
        data: pedido.prazo_estimado,
      })
    }
  }

  for (const produto of db.produtos) {
    if (produto.ativo && ['armacao', 'acessorio'].includes(produto.tipo) && (produto.estoque_atual ?? 0) === 0) {
      linhas.push({
        tipo: 'estoque_zerado',
        titulo: `${produto.marca} ${produto.modelo} zerado`,
        subtitulo: produto.sku,
        referencia_id: produto.id,
        data: null,
      })
    }
  }

  linhas.sort((a, b) => {
    if (!a.data) return 1
    if (!b.data) return -1
    return a.data.localeCompare(b.data)
  })

  return new RpcResult(linhas)
}

const FUNCOES = {
  listar_clientes_resumo,
  listar_ordens_servico,
  criar_ordem_servico,
  avancar_status_os,
  ajustar_estoque,
  fechar_periodo_comissoes,
  resumo_vendas_periodo,
  produtos_mais_vendidos,
  vendas_por_vendedor,
  calcular_destinatarios_campanha,
  dashboard_indicadores,
  dashboard_acao_necessaria,
}

export function chamarRpc(nome, params = {}) {
  const fn = FUNCOES[nome]
  if (!fn) {
    const resultado = new RpcResult(null)
    resultado.error = { message: `RPC demo desconhecida: ${nome}` }
    return resultado
  }
  try {
    return fn(params)
  } catch (erro) {
    const resultado = new RpcResult(null)
    resultado.error = { message: erro.message }
    return resultado
  }
}
