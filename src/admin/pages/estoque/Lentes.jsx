import { PageHeader } from '../../../shared/components/PageHeader'
import { Vazio } from '../../../shared/components/EstadoTela'

export default function Lentes() {
  return (
    <div>
      <PageHeader titulo="Lentes" descricao="Pedidos de lentes em andamento" />
      <Vazio
        titulo="Módulo em implementação"
        descricao="Acompanhamento de pedidos de lentes será implementado no Módulo 3."
      />
    </div>
  )
}
