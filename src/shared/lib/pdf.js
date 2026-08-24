import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatarMoeda, formatarData, formatarCPF } from '../utils/formatters'
import { STATUS_OS_LABEL } from '../constants/statusOS'

const COR_MARCA = [37, 99, 235] // brand-600
const COR_TEXTO_CLARO = [255, 255, 255]
const COR_CINZA = [100, 116, 139]

async function carregarLogo(url) {
  if (!url) return null
  try {
    const resposta = await fetch(url)
    const blob = await resposta.blob()
    const dataUrl = await new Promise((resolve, reject) => {
      const leitor = new FileReader()
      leitor.onloadend = () => resolve(leitor.result)
      leitor.onerror = reject
      leitor.readAsDataURL(blob)
    })
    const dimensoes = await new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve({ largura: img.naturalWidth, altura: img.naturalHeight })
      img.onerror = () => resolve(null)
      img.src = dataUrl
    })
    if (!dimensoes) return null

    const formatoMatch = /^data:image\/(png|jpeg|jpg);/i.exec(dataUrl)
    const formato = formatoMatch && formatoMatch[1].toLowerCase() === 'jpg' ? 'JPEG' : (formatoMatch?.[1] ?? 'png').toUpperCase()

    return { dataUrl, formato, proporcao: dimensoes.largura / dimensoes.altura }
  } catch {
    return null
  }
}

function desenharCabecalho(doc, loja, logo) {
  const largura = doc.internal.pageSize.getWidth()

  doc.setFillColor(...COR_MARCA)
  doc.rect(0, 0, largura, 30, 'F')

  doc.setTextColor(...COR_TEXTO_CLARO)
  doc.setFontSize(16)
  doc.setFont(undefined, 'bold')
  doc.text(loja?.nome || 'Ótica Monte Sinai', 14, 14)

  doc.setFontSize(9)
  doc.setFont(undefined, 'normal')
  const linhaContato = [loja?.endereco, loja?.telefone].filter(Boolean).join(' · ')
  if (linhaContato) doc.text(linhaContato, 14, 21)
  if (loja?.cnpj) doc.text(`CNPJ: ${loja.cnpj}`, 14, 26)

  if (logo) {
    const alturaLogo = 18
    const larguraLogo = alturaLogo * logo.proporcao
    doc.addImage(logo.dataUrl, logo.formato, largura - 14 - larguraLogo, 6, larguraLogo, alturaLogo)
  }

  doc.setTextColor(0, 0, 0)
}

function desenharRodape(doc) {
  const paginas = doc.internal.getNumberOfPages()
  const largura = doc.internal.pageSize.getWidth()
  const altura = doc.internal.pageSize.getHeight()

  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(...COR_CINZA)
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, altura - 8)
    doc.text(`Página ${i} de ${paginas}`, largura - 14, altura - 8, { align: 'right' })
    doc.setTextColor(0, 0, 0)
  }
}

/**
 * Gera o PDF de orçamento (status = orcamento) ou recibo (demais status)
 * de uma OS, e dispara o download no navegador.
 */
export async function gerarPdfOS({ os, cliente, itens, loja }) {
  const doc = new jsPDF()
  const ehOrcamento = os.status === 'orcamento'
  const titulo = ehOrcamento ? 'Orçamento' : 'Recibo'
  const logo = await carregarLogo(loja?.logo_url)

  desenharCabecalho(doc, loja, logo)

  doc.setFontSize(14)
  doc.setFont(undefined, 'bold')
  doc.text(`${titulo} — OS #${os.numero}`, 14, 42)
  doc.setFont(undefined, 'normal')

  doc.setFontSize(10)
  doc.text(`Cliente: ${cliente?.nome ?? ''}`, 14, 50)
  doc.text(`CPF: ${formatarCPF(cliente?.cpf)}`, 14, 55)
  doc.text(`Data: ${formatarData(os.created_at)}`, 14, 60)
  doc.text(`Status: ${STATUS_OS_LABEL[os.status] ?? os.status}`, 14, 65)
  if (os.prazo_entrega) {
    doc.text(`Prazo de entrega: ${formatarData(os.prazo_entrega)}`, 14, 70)
  }

  autoTable(doc, {
    startY: 78,
    head: [['Item', 'Qtd.', 'Valor unit.', 'Subtotal']],
    headStyles: { fillColor: COR_MARCA, textColor: COR_TEXTO_CLARO },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    body: itens.map((item) => [
      item.descricao,
      String(item.quantidade),
      formatarMoeda(item.valor_unitario),
      formatarMoeda(item.valor_unitario * item.quantidade),
    ]),
  })

  const finalY = doc.lastAutoTable.finalY + 10
  const subtotal = itens.reduce((soma, item) => soma + item.valor_unitario * item.quantidade, 0)

  doc.setFillColor(248, 250, 252)
  doc.rect(120, finalY - 6, 76, 28, 'F')

  doc.setFontSize(10)
  doc.text('Subtotal:', 126, finalY)
  doc.text(formatarMoeda(subtotal), 190, finalY, { align: 'right' })
  doc.text('Desconto:', 126, finalY + 7)
  doc.text(formatarMoeda(os.desconto), 190, finalY + 7, { align: 'right' })

  doc.setFont(undefined, 'bold')
  doc.setFontSize(12)
  doc.text('Total:', 126, finalY + 16)
  doc.text(formatarMoeda(subtotal - Number(os.desconto ?? 0)), 190, finalY + 16, { align: 'right' })
  doc.setFont(undefined, 'normal')

  desenharRodape(doc)
  doc.save(`${titulo.toLowerCase()}-os-${os.numero}.pdf`)
}

/**
 * Gera o recibo em PDF de um pagamento individual (usado na área do
 * cliente), com o mesmo cabeçalho com a marca da loja.
 */
export async function gerarReciboPagamento({ pagamento, cliente, numeroOS, loja }) {
  const doc = new jsPDF()
  const logo = await carregarLogo(loja?.logo_url)

  desenharCabecalho(doc, loja, logo)

  doc.setFontSize(14)
  doc.setFont(undefined, 'bold')
  doc.text(`Recibo de pagamento — OS #${numeroOS}`, 14, 42)
  doc.setFont(undefined, 'normal')

  doc.setFontSize(10)
  doc.text(`Cliente: ${cliente?.nome ?? ''}`, 14, 52)
  doc.text(`CPF: ${formatarCPF(cliente?.cpf)}`, 14, 58)
  doc.text(`Forma de pagamento: ${pagamento.forma_pagamento ?? '—'}`, 14, 64)
  doc.text(`Data do pagamento: ${formatarData(pagamento.data_pagamento)}`, 14, 70)

  doc.setFillColor(248, 250, 252)
  doc.rect(14, 80, 182, 20, 'F')
  doc.setFont(undefined, 'bold')
  doc.setFontSize(13)
  doc.text('Valor pago:', 20, 93)
  doc.text(formatarMoeda(pagamento.valor), 190, 93, { align: 'right' })
  doc.setFont(undefined, 'normal')

  desenharRodape(doc)
  doc.save(`recibo-os-${numeroOS}.pdf`)
}
