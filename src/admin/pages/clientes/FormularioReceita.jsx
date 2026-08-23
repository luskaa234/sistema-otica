import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../../shared/components/PageHeader'
import { Input } from '../../../shared/components/Input'
import { Select } from '../../../shared/components/Select'
import { Button } from '../../../shared/components/Button'
import { supabase } from '../../../shared/lib/supabaseClient'
import { enviarArquivo } from '../../../shared/lib/storage'
import { useAuth } from '../../../shared/hooks/useAuth'

const OPCOES_TIPO_LENTE = [
  { value: 'visao_simples', label: 'Visão simples' },
  { value: 'multifocal', label: 'Multifocal' },
  { value: 'bifocal', label: 'Bifocal' },
]

export default function FormularioReceita() {
  const { id: clienteId } = useParams()
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const [arquivoFoto, setArquivoFoto] = useState(null)
  const [erroSalvar, setErroSalvar] = useState(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      data_consulta: '',
      medico: '',
      esferico_od: '',
      cilindrico_od: '',
      eixo_od: '',
      esferico_oe: '',
      cilindrico_oe: '',
      eixo_oe: '',
      adicao: '',
      dnp: '',
      altura: '',
      tipo_lente: 'visao_simples',
    },
  })

  async function onSubmit(valores) {
    setErroSalvar(null)

    try {
      let fotoUrl = null
      if (arquivoFoto) {
        fotoUrl = await enviarArquivo('receitas', clienteId, arquivoFoto)
      }

      const { error: erroDesativar } = await supabase
        .from('receitas')
        .update({ ativa: false })
        .eq('cliente_id', clienteId)
        .eq('ativa', true)

      if (erroDesativar) throw erroDesativar

      const numerico = (valor) => (valor === '' ? null : Number(valor))

      const { error: erroInserir } = await supabase.from('receitas').insert({
        cliente_id: clienteId,
        data_consulta: valores.data_consulta || null,
        medico: valores.medico || null,
        esferico_od: numerico(valores.esferico_od),
        cilindrico_od: numerico(valores.cilindrico_od),
        eixo_od: numerico(valores.eixo_od),
        esferico_oe: numerico(valores.esferico_oe),
        cilindrico_oe: numerico(valores.cilindrico_oe),
        eixo_oe: numerico(valores.eixo_oe),
        adicao: numerico(valores.adicao),
        dnp: numerico(valores.dnp),
        altura: numerico(valores.altura),
        tipo_lente: valores.tipo_lente,
        foto_url: fotoUrl,
        ativa: true,
        criado_por: perfil?.id ?? null,
      })

      if (erroInserir) throw erroInserir

      navigate(`/admin/clientes/${clienteId}`)
    } catch {
      setErroSalvar('Não foi possível salvar a receita. Tente novamente.')
    }
  }

  return (
    <div>
      <PageHeader titulo="Nova Receita" descricao="Cadastro de receita óptica versionada" />

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Data da consulta" type="date" {...register('data_consulta')} />
          <Input label="Médico/oftalmologista" {...register('medico')} />
        </div>

        <fieldset className="rounded-lg border border-gray-200 p-4">
          <legend className="px-1 text-sm font-medium text-gray-700">Olho direito (OD)</legend>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Esférico" type="number" step="0.25" {...register('esferico_od')} />
            <Input label="Cilíndrico" type="number" step="0.25" {...register('cilindrico_od')} />
            <Input label="Eixo" type="number" {...register('eixo_od')} />
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-gray-200 p-4">
          <legend className="px-1 text-sm font-medium text-gray-700">Olho esquerdo (OE)</legend>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Esférico" type="number" step="0.25" {...register('esferico_oe')} />
            <Input label="Cilíndrico" type="number" step="0.25" {...register('cilindrico_oe')} />
            <Input label="Eixo" type="number" {...register('eixo_oe')} />
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input label="Adição" type="number" step="0.25" {...register('adicao')} />
          <Input label="DNP" type="number" step="0.5" {...register('dnp')} />
          <Input label="Altura" type="number" step="0.5" {...register('altura')} />
        </div>

        <Select
          label="Tipo de lente recomendada"
          options={OPCOES_TIPO_LENTE}
          {...register('tipo_lente')}
        />

        <div>
          <label className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700">
            {arquivoFoto ? `Foto selecionada: ${arquivoFoto.name}` : 'Anexar foto da receita física'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setArquivoFoto(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        {errors.data_consulta && (
          <p className="text-sm text-red-600">{errors.data_consulta.message}</p>
        )}
        {erroSalvar && <p className="text-sm text-red-600">{erroSalvar}</p>}

        <div className="flex gap-3">
          <Button type="submit" loading={isSubmitting}>
            Salvar receita
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
