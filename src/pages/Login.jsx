import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { supabase } from '../shared/lib/supabaseClient'
import { useAuth } from '../shared/hooks/useAuth'
import { Button } from '../shared/components/Button'
import { Input } from '../shared/components/Input'

/**
 * Login único em "/". Após autenticar, o useAuth resolve o perfil
 * (funcionário ou cliente) e o usuário é redirecionado automaticamente.
 *
 * Login por CPF para clientes (Módulo 6) substituirá este formulário
 * na área /app, mantendo e-mail/senha para funcionários.
 */
export default function Login() {
  const { logado, perfil, carregando } = useAuth()
  const [erroLogin, setErroLogin] = useState(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm()

  if (logado && !carregando && perfil) {
    return <Navigate to={perfil.tipo === 'funcionario' ? '/admin' : '/app'} replace />
  }

  async function onSubmit(valores) {
    setErroLogin(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: valores.email,
      password: valores.senha,
    })
    if (error) {
      setErroLogin('E-mail ou senha inválidos.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h1 className="mb-1 text-lg font-semibold text-gray-900">Ótica Monte Sinai</h1>
        <p className="mb-6 text-sm text-gray-500">Entre com seu e-mail e senha</p>

        <div className="flex flex-col gap-4">
          <Input
            label="E-mail"
            type="email"
            {...register('email', { required: 'Informe o e-mail' })}
            error={errors.email?.message}
          />
          <Input
            label="Senha"
            type="password"
            {...register('senha', { required: 'Informe a senha' })}
            error={errors.senha?.message}
          />
          {erroLogin && <p className="text-sm text-red-600">{erroLogin}</p>}
          <Button type="submit" loading={isSubmitting} className="w-full">
            Entrar
          </Button>
        </div>
      </form>
    </div>
  )
}
