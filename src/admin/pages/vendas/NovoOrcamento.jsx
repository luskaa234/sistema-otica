import { PageHeader } from '../../../shared/components/PageHeader'
import { Vazio } from '../../../shared/components/EstadoTela'

export default function NovoOrcamento() {
  return (
    <div>
      <PageHeader titulo="Novo Orçamento" descricao="Cliente, receita, itens e total" />
      <Vazio
        titulo="Módulo em implementação"
        descricao="Fluxo de novo orçamento será implementado no Módulo 2."
      />
    </div>
  )
}
