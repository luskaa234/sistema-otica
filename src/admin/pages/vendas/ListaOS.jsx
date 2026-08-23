import { PageHeader } from '../../../shared/components/PageHeader'
import { Vazio } from '../../../shared/components/EstadoTela'

export default function ListaOS() {
  return (
    <div>
      <PageHeader titulo="Ordens de Serviço" descricao="Orçamentos e vendas em andamento" />
      <Vazio
        titulo="Módulo em implementação"
        descricao="Lista de OS com filtro por status será implementada no Módulo 2."
      />
    </div>
  )
}
