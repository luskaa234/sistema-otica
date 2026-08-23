import { PageHeader } from '../../../shared/components/PageHeader'
import { Vazio } from '../../../shared/components/EstadoTela'

export default function ListaFuncionarios() {
  return (
    <div>
      <PageHeader titulo="Funcionários" descricao="Cadastro e perfis de acesso" />
      <Vazio
        titulo="Módulo em implementação"
        descricao="CRUD de funcionários e perfis será implementado no Módulo 7."
      />
    </div>
  )
}
