import { PageHeader } from '../../../shared/components/PageHeader'
import { Vazio } from '../../../shared/components/EstadoTela'

export default function FluxoCaixa() {
  return (
    <div>
      <PageHeader titulo="Fluxo de Caixa" descricao="Entradas x saídas" />
      <Vazio
        titulo="Módulo em implementação"
        descricao="Gráfico de fluxo de caixa será implementado no Módulo 4."
      />
    </div>
  )
}
