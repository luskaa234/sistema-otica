import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../shared/components/Button'
import { Input } from '../../shared/components/Input'
import { supabase } from '../../shared/lib/supabaseClient'
import { emailInternoCliente } from '../../shared/utils/authCliente'
import { mascararCPF } from '../../shared/utils/formatters'

const ETAPAS = {
  ENTRAR: 'entrar',
  CODIGO: 'codigo',
  DEFINIR_SENHA: 'definir_senha',
}

export default function Login() {
  const navigate = useNavigate()
  const [etapa, setEtapa] = useState(ETAPAS.ENTRAR)
  const [cpf, setCpf] = useState('')
  const [senha, setSenha] = useState('')
  const [codigo, setCodigo] = useState('')
  const [emailInterno, setEmailInterno] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(null)
  const [novaSenha, setNovaSenha] = useState('')

  async function entrarComSenha(e) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: emailInternoCliente(cpf),
      password: senha,
    })

    setCarregando(false)

    if (error) {
      setErro('CPF ou senha inválidos.')
      return
    }
    navigate('/app')
  }

  async function solicitarCodigo() {
    setErro(null)
    const digits = cpf.replace(/\D/g, '')
    if (digits.length !== 11) {
      setErro('Informe um CPF válido.')
      return
    }

    setCarregando(true)
    const { data, error } = await supabase.functions.invoke('cliente-solicitar-codigo', {
      body: { cpf: digits },
    })
    setCarregando(false)

    if (error || data?.error) {
      setErro(data?.error ?? 'Não foi possível enviar o código.')
      return
    }

    setEmailInterno(data.email)
    setEtapa(ETAPAS.CODIGO)
  }

  async function confirmarCodigo(e) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)

    const { error } = await supabase.auth.verifyOtp({
      email: emailInterno,
      token: codigo,
      type: 'email',
    })

    setCarregando(false)

    if (error) {
      setErro('Código inválido ou expirado.')
      return
    }

    setEtapa(ETAPAS.DEFINIR_SENHA)
  }

  async function definirSenha(e) {
    e.preventDefault()
    if (novaSenha.length < 6) {
      setErro('A senha deve ter ao menos 6 caracteres.')
      return
    }
    setCarregando(true)
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    setCarregando(false)

    if (error) {
      setErro('Não foi possível definir a senha, mas você já está conectado.')
    }
    navigate('/app')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold text-gray-900">Ótica Monte Sinai</h1>

        {etapa === ETAPAS.ENTRAR && (
          <form onSubmit={entrarComSenha} className="mt-4 flex flex-col gap-4">
            <p className="text-sm text-gray-500">Entre com seu CPF e senha</p>
            <Input
              label="CPF"
              value={cpf}
              onChange={(e) => setCpf(mascararCPF(e.target.value))}
              required
            />
            <Input
              label="Senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <Button type="submit" loading={carregando} className="w-full">
              Entrar
            </Button>
            <button
              type="button"
              onClick={solicitarCodigo}
              className="text-sm text-blue-600 hover:underline"
            >
              Primeiro acesso ou esqueci a senha — entrar com código por e-mail
            </button>
          </form>
        )}

        {etapa === ETAPAS.CODIGO && (
          <form onSubmit={confirmarCodigo} className="mt-4 flex flex-col gap-4">
            <p className="text-sm text-gray-500">
              Enviamos um código para o e-mail cadastrado na loja. Informe-o abaixo.
            </p>
            <Input
              label="Código recebido"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              required
            />
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <Button type="submit" loading={carregando} className="w-full">
              Confirmar
            </Button>
          </form>
        )}

        {etapa === ETAPAS.DEFINIR_SENHA && (
          <form onSubmit={definirSenha} className="mt-4 flex flex-col gap-4">
            <p className="text-sm text-gray-500">
              Código confirmado! Defina uma senha para os próximos acessos.
            </p>
            <Input
              label="Nova senha"
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              required
            />
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <Button type="submit" loading={carregando} className="w-full">
              Salvar e entrar
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
