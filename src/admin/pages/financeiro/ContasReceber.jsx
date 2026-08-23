import { PageHeader } from '../../../shared/components/PageHeader'
import { Vazio } from '../../../shared/components/EstadoTela'

export default function ContasReceber() {
  return (
    <div>
      <PageHeader titulo="Contas a Receber" descricao="Pagamentos vinculados a OS" />
      <Vazio
        titulo="Módulo em implementação"
        descricao="Contas a receber (espelhando status Asaas) será implementado no Módulo 4."
      />
    </div>
  )
}
