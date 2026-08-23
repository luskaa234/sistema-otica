import { PageHeader } from '../../shared/components/PageHeader'
import { Vazio } from '../../shared/components/EstadoTela'

export default function MinhasReceitas() {
  return (
    <div>
      <PageHeader titulo="Minhas Receitas" descricao="Histórico de receitas ópticas" />
      <Vazio
        titulo="Módulo em implementação"
        descricao="Lista de receitas do cliente será implementada no Módulo 6."
      />
    </div>
  )
}
