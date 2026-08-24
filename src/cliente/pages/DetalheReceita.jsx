import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Carregando, Erro } from '../../shared/components/EstadoTela'
import { useSupabaseQuery } from '../../shared/hooks/useSupabaseQuery'
import { formatarData } from '../../shared/utils/formatters'

const LABEL_TIPO_LENTE = {
  visao_simples: 'Visão simples',
  multifocal: 'Multifocal',
  bifocal: 'Bifocal',
}

export default function DetalheReceitaCliente() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { dados: receita, carregando, erro } = useSupabaseQuery(
    (supabase) => supabase.from('receitas').select('*').eq('id', id).single(),
    [id]
  )

  if (carregando) return <Carregando />
  if (erro || !receita) return <Erro mensagem="Receita não encontrada." />

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-gray-500">
        <ArrowLeft size={16} />
        Voltar
      </button>

      <div className="rounded-xl border border-gray-100 shadow-soft bg-white p-4">
        <p className="mb-1 text-lg font-semibold text-gray-900">
          {formatarData(receita.data_consulta) || formatarData(receita.created_at)}
        </p>
        <p className="mb-4 text-sm text-gray-500">{receita.medico}</p>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <Campo rotulo="Esférico OD" valor={receita.esferico_od} />
          <Campo rotulo="Cilíndrico OD" valor={receita.cilindrico_od} />
          <Campo rotulo="Eixo OD" valor={receita.eixo_od} />
          <Campo rotulo="Esférico OE" valor={receita.esferico_oe} />
          <Campo rotulo="Cilíndrico OE" valor={receita.cilindrico_oe} />
          <Campo rotulo="Eixo OE" valor={receita.eixo_oe} />
          <Campo rotulo="Adição" valor={receita.adicao} />
          <Campo rotulo="DNP" valor={receita.dnp} />
          <Campo rotulo="Altura" valor={receita.altura} />
          <Campo rotulo="Tipo de lente" valor={LABEL_TIPO_LENTE[receita.tipo_lente] ?? receita.tipo_lente} />
        </div>

        {receita.foto_url && (
          <img src={receita.foto_url} alt="Foto da receita" className="mt-4 w-full rounded-lg" />
        )}
      </div>
    </div>
  )
}

function Campo({ rotulo, valor }) {
  return (
    <div>
      <p className="text-gray-400">{rotulo}</p>
      <p className="font-medium text-gray-900">{valor ?? '—'}</p>
    </div>
  )
}
