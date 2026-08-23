import { PageHeader } from '../../../shared/components/PageHeader'
import { Vazio } from '../../../shared/components/EstadoTela'

export default function DadosLoja() {
  return (
    <div>
      <PageHeader titulo="Configurações" descricao="Dados da loja e preferências" />
      <Vazio
        titulo="Módulo em implementação"
        descricao="Dados da loja, formas de pagamento e mensagens automáticas serão implementados no Módulo 8."
      />
    </div>
  )
}
