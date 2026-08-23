import { PageHeader } from '../../../shared/components/PageHeader'
import { Vazio } from '../../../shared/components/EstadoTela'

export default function DetalheOS() {
  return (
    <div>
      <PageHeader titulo="Detalhe da OS" descricao="Itens, status e histórico" />
      <Vazio
        titulo="Módulo em implementação"
        descricao="Detalhe da OS com timeline de status será implementado no Módulo 2."
      />
    </div>
  )
}
