import { PageHeader } from '../../../shared/components/PageHeader'
import { Vazio } from '../../../shared/components/EstadoTela'

export default function Fornecedores() {
  return (
    <div>
      <PageHeader titulo="Fornecedores" descricao="Cadastro de fornecedores" />
      <Vazio
        titulo="Módulo em implementação"
        descricao="CRUD de fornecedores será implementado no Módulo 3."
      />
    </div>
  )
}
