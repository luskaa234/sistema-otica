import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../../shared/components/PageHeader'
import { Input } from '../../../shared/components/Input'
import { Button } from '../../../shared/components/Button'
import { Carregando } from '../../../shared/components/EstadoTela'
import { supabase } from '../../../shared/lib/supabaseClient'
import { useAuth } from '../../../shared/hooks/useAuth'
import { buscarEnderecoPorCep } from '../../../shared/lib/viacep'
import { enviarArquivo } from '../../../shared/lib/storage'
import { validarCPF } from '../../../shared/utils/validators'
import { mascararCPF, mascararTelefone, mascararCEP } from '../../../shared/utils/formatters'

export default function FormularioCliente() {
  const { id } = useParams()
  const modoEdicao = Boolean(id)
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const [carregandoCliente, setCarregandoCliente] = useState(modoEdicao)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [arquivoFoto, setArquivoFoto] = useState(null)
  const [fotoAtualUrl, setFotoAtualUrl] = useState(null)
  const [erroSalvar, setErroSalvar] = useState(null)

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      nome: '',
      cpf: '',
      data_nascimento: '',
      telefone: '',
      email: '',
      cep: '',
      endereco: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: '',
      observacoes: '',
    },
  })

  useEffect(() => {
    if (!modoEdicao) return

    let ativo = true
    supabase
      .from('clientes')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (!ativo || !data) return
        reset({
          nome: data.nome ?? '',
          cpf: data.cpf ?? '',
          data_nascimento: data.data_nascimento ?? '',
          telefone: data.telefone ?? '',
          email: data.email ?? '',
          cep: data.cep ?? '',
          endereco: data.endereco ?? '',
          numero: data.numero ?? '',
          complemento: data.complemento ?? '',
          bairro: data.bairro ?? '',
          cidade: data.cidade ?? '',
          uf: data.uf ?? '',
          observacoes: data.observacoes ?? '',
        })
        setFotoAtualUrl(data.foto_url)
        setCarregandoCliente(false)
      })

    return () => {
      ativo = false
    }
  }, [id, modoEdicao, reset])

  async function tratarBlurCep(cep) {
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8) return

    setBuscandoCep(true)
    const endereco = await buscarEnderecoPorCep(cep)
    setBuscandoCep(false)

    if (endereco) {
      setValue('endereco', endereco.endereco)
      setValue('bairro', endereco.bairro)
      setValue('cidade', endereco.cidade)
      setValue('uf', endereco.uf)
    }
  }

  async function onSubmit(valores) {
    setErroSalvar(null)

    try {
      let fotoUrl = fotoAtualUrl
      if (arquivoFoto) {
        fotoUrl = await enviarArquivo('clientes', id ?? crypto.randomUUID(), arquivoFoto)
      }

      const payload = { ...valores, foto_url: fotoUrl }

      if (modoEdicao) {
        const { error } = await supabase.from('clientes').update(payload).eq('id', id)
        if (error) throw error
        navigate(`/admin/clientes/${id}`)
      } else {
        const { data, error } = await supabase.from('clientes').insert(payload).select('id').single()
        if (error) throw error

        if (perfil?.id) {
          await supabase.from('logs_auditoria').insert({
            funcionario_id: perfil.id,
            acao: 'criar_cliente',
            tabela_afetada: 'clientes',
            registro_id: data.id,
            detalhes: { nome: valores.nome },
          })
        }

        navigate(`/admin/clientes/${data.id}`)
      }
    } catch (err) {
      setErroSalvar(
        err.code === '23505'
          ? 'Já existe um cliente cadastrado com este CPF.'
          : 'Não foi possível salvar o cliente. Tente novamente.'
      )
    }
  }

  if (carregandoCliente) return <Carregando texto="Carregando cliente..." />

  return (
    <div>
      <PageHeader titulo={modoEdicao ? 'Editar Cliente' : 'Novo Cliente'} />

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gray-100">
            {(arquivoFoto && URL.createObjectURL(arquivoFoto)) || fotoAtualUrl ? (
              <img
                src={arquivoFoto ? URL.createObjectURL(arquivoFoto) : fotoAtualUrl}
                alt="Foto do cliente"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xs text-gray-400">Sem foto</span>
            )}
          </div>
          <label className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700">
            Enviar foto
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setArquivoFoto(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Nome completo"
            {...register('nome', { required: 'Informe o nome' })}
            error={errors.nome?.message}
          />
          <Controller
            control={control}
            name="cpf"
            rules={{
              required: 'Informe o CPF',
              validate: (valor) => validarCPF(valor) || 'CPF inválido',
            }}
            render={({ field }) => (
              <Input
                label="CPF"
                value={field.value}
                onChange={(e) => field.onChange(mascararCPF(e.target.value))}
                error={errors.cpf?.message}
              />
            )}
          />
          <Input label="Data de nascimento" type="date" {...register('data_nascimento')} />
          <Controller
            control={control}
            name="telefone"
            rules={{ required: 'Informe o telefone' }}
            render={({ field }) => (
              <Input
                label="Telefone/WhatsApp"
                value={field.value}
                onChange={(e) => field.onChange(mascararTelefone(e.target.value))}
                error={errors.telefone?.message}
              />
            )}
          />
          <Input label="E-mail" type="email" {...register('email')} className="sm:col-span-2" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Controller
            control={control}
            name="cep"
            render={({ field }) => (
              <Input
                label={buscandoCep ? 'CEP (buscando...)' : 'CEP'}
                value={field.value}
                onChange={(e) => field.onChange(mascararCEP(e.target.value))}
                onBlur={(e) => tratarBlurCep(e.target.value)}
              />
            )}
          />
          <Input label="Endereço" {...register('endereco')} className="sm:col-span-2" />
          <Input label="Número" {...register('numero')} />
          <Input label="Complemento" {...register('complemento')} />
          <Input label="Bairro" {...register('bairro')} />
          <Input label="Cidade" {...register('cidade')} />
          <Input label="UF" maxLength={2} {...register('uf')} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Observações internas</label>
          <textarea
            {...register('observacoes')}
            rows={3}
            placeholder="Alergias, preferências, observações gerais..."
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>

        {erroSalvar && <p className="text-sm text-red-600">{erroSalvar}</p>}

        <div className="flex gap-3">
          <Button type="submit" loading={isSubmitting}>
            Salvar
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
