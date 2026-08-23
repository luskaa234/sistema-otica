import { PageHeader } from '../../../shared/components/PageHeader'
import { Vazio } from '../../../shared/components/EstadoTela'

export default function Comissoes() {
  return (
    <div>
      <PageHeader titulo="Comissões" descricao="Regras e fechamento por vendedor" />
      <Vazio
        titulo="Módulo em implementação"
        descricao="Configuração e relatório de comissões será implementado no Módulo 4."
      />
    </div>
  )
}
