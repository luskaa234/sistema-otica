import { PageHeader } from '../../shared/components/PageHeader'
import { Vazio } from '../../shared/components/EstadoTela'

export default function Login() {
  return (
    <div>
      <PageHeader
        titulo="Entrar"
        descricao="Login do cliente por CPF"
      />
      <Vazio
        titulo="Módulo em implementação"
        descricao="O login por CPF + senha (ou código via WhatsApp/e-mail) será implementado no Módulo 6. Por enquanto, use a tela de login em / (e-mail e senha)."
      />
    </div>
  )
}
