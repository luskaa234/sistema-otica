import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../shared/components/PageHeader'
import { Carregando, Vazio } from '../../shared/components/EstadoTela'
import { useSupabaseQuery } from '../../shared/hooks/useSupabaseQuery'
import { useAuth } from '../../shared/hooks/useAuth'
import { formatarData } from '../../shared/utils/formatters'

const LABEL_TIPO_LENTE = {
  visao_simples: 'Visão simples',
  multifocal: 'Multifocal',
  bifocal: 'Bifocal',
}

export default function MinhasReceitas() {
  const { perfil } = useAuth()
  const navigate = useNavigate()

  const { dados: receitas, carregando } = useSupabaseQuery(
    (supabase) =>
      supabase
        .from('receitas')
        .select('*')
        .eq('cliente_id', perfil?.id)
        .order('created_at', { ascending: false }),
    [perfil?.id]
  )

  return (
    <div>
      <PageHeader titulo="Minhas Receitas" />

      {carregando && <Carregando />}
      {!carregando && (!receitas || receitas.length === 0) && (
        <Vazio titulo="Nenhuma receita cadastrada ainda" />
      )}

      <div className="space-y-2">
        {receitas?.map((receita) => (
          <button
            key={receita.id}
            onClick={() => navigate(`/app/receitas/${receita.id}`)}
            className="flex w-full items-center justify-between rounded-xl border border-gray-100 shadow-soft bg-white p-4 text-left"
          >
            <div>
              <p className="font-medium text-gray-900">
                {formatarData(receita.data_consulta) || formatarData(receita.created_at)}
              </p>
              <p className="text-sm text-gray-500">{LABEL_TIPO_LENTE[receita.tipo_lente] ?? receita.tipo_lente}</p>
            </div>
            {receita.ativa && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Ativa
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
