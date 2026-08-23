import { Outlet } from 'react-router-dom'
import { SubNav } from '../../shared/components/SubNav'

const ITENS = [
  { to: '/admin/estoque', label: 'Armações', fim: true },
  { to: '/admin/estoque/lentes', label: 'Lentes' },
  { to: '/admin/estoque/fornecedores', label: 'Fornecedores' },
]

export function EstoqueLayout() {
  return (
    <div>
      <SubNav itens={ITENS} />
      <Outlet />
    </div>
  )
}
