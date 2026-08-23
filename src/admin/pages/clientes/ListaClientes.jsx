import { PageHeader } from '../../../shared/components/PageHeader'
import { Vazio } from '../../../shared/components/EstadoTela'

export default function ListaClientes() {
  return (
    <div>
      <PageHeader titulo="Clientes" descricao="Busca, cadastro e histórico de clientes" />
      <Vazio
        titulo="Módulo em implementação"
        descricao="Lista, busca e cadastro de clientes serão implementados no Módulo 1."
      />
    </div>
  )
}
