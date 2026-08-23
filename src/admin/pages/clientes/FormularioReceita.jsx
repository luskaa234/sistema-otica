import { PageHeader } from '../../../shared/components/PageHeader'
import { Vazio } from '../../../shared/components/EstadoTela'

export default function FormularioReceita() {
  return (
    <div>
      <PageHeader titulo="Nova Receita" descricao="Cadastro de receita óptica versionada" />
      <Vazio
        titulo="Módulo em implementação"
        descricao="Formulário de receita (OD/OE, versionamento) será implementado no Módulo 1."
      />
    </div>
  )
}
