import { PageHeader } from '../../shared/components/PageHeader'
import { Vazio } from '../../shared/components/EstadoTela'

export default function Pagamentos() {
  return (
    <div>
      <PageHeader titulo="Pagamentos" descricao="Parcelas em aberto e histórico" />
      <Vazio
        titulo="Módulo em implementação"
        descricao="Pagamentos via Asaas (Edge Function) serão implementados no Módulo 6."
      />
    </div>
  )
}
