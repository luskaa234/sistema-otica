import { PageHeader } from '../../../shared/components/PageHeader'
import { Vazio } from '../../../shared/components/EstadoTela'

export default function Armacoes() {
  return (
    <div>
      <PageHeader titulo="Armações" descricao="Estoque de armações" />
      <Vazio
        titulo="Módulo em implementação"
        descricao="Cadastro e ajuste de estoque de armações será implementado no Módulo 3."
      />
    </div>
  )
}
