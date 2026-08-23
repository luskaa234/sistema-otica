import { PageHeader } from '../../shared/components/PageHeader'
import { Vazio } from '../../shared/components/EstadoTela'

export default function MinhasOS() {
  return (
    <div>
      <PageHeader titulo="Meus Pedidos" descricao="Acompanhamento de ordens de serviço" />
      <Vazio
        titulo="Módulo em implementação"
        descricao="Timeline de status dos pedidos será implementada no Módulo 6."
      />
    </div>
  )
}
