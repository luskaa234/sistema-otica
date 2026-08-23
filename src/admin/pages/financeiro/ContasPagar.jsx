import { PageHeader } from '../../../shared/components/PageHeader'
import { Vazio } from '../../../shared/components/EstadoTela'

export default function ContasPagar() {
  return (
    <div>
      <PageHeader titulo="Contas a Pagar" descricao="Despesas da loja" />
      <Vazio
        titulo="Módulo em implementação"
        descricao="Contas a pagar será implementado no Módulo 4."
      />
    </div>
  )
}
