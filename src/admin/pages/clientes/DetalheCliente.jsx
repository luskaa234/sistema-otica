import { PageHeader } from '../../../shared/components/PageHeader'
import { Vazio } from '../../../shared/components/EstadoTela'

export default function DetalheCliente() {
  return (
    <div>
      <PageHeader titulo="Detalhe do Cliente" descricao="Dados, histórico de compras e receitas" />
      <Vazio
        titulo="Módulo em implementação"
        descricao="Detalhe do cliente com histórico e receitas será implementado no Módulo 1."
      />
    </div>
  )
}
