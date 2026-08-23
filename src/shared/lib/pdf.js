import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatarMoeda, formatarData, formatarCPF } from '../utils/formatters'
import { STATUS_OS_LABEL } from '../constants/statusOS'

/**
 * Gera o PDF de orçamento (status = orcamento) ou recibo (demais status)
 * de uma OS, e dispara o download no navegador.
 */
export function gerarPdfOS({ os, cliente, itens, loja }) {
  const doc = new jsPDF()
  const ehOrcamento = os.status === 'orcamento'
  const titulo = ehOrcamento ? 'Orçamento' : 'Recibo'

  doc.setFontSize(16)
  doc.text(loja?.nome || 'Ótica Monte Sinai', 14, 18)
  doc.setFontSize(10)
  doc.text(loja?.endereco || '', 14, 24)
  doc.text(loja?.telefone || '', 14, 29)

  doc.setFontSize(14)
  doc.text(`${titulo} #${os.numero}`, 14, 42)

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
    body: itens.map((item) => [
      item.descricao,
      String(item.quantidade),
      formatarMoeda(item.valor_unitario),
      formatarMoeda(item.valor_unitario * item.quantidade),
    ]),
  })

  const finalY = doc.lastAutoTable.finalY + 10
  const subtotal = itens.reduce((soma, item) => soma + item.valor_unitario * item.quantidade, 0)

  doc.text(`Subtotal: ${formatarMoeda(subtotal)}`, 14, finalY)
  doc.text(`Desconto: ${formatarMoeda(os.desconto)}`, 14, finalY + 5)
  doc.setFontSize(12)
  doc.text(`Total: ${formatarMoeda(subtotal - Number(os.desconto ?? 0))}`, 14, finalY + 13)

  doc.save(`${titulo.toLowerCase()}-os-${os.numero}.pdf`)
}
