import { Outlet } from 'react-router-dom'
import { SubNav } from '../../shared/components/SubNav'

const ITENS = [
  { to: '/admin/financeiro', label: 'Contas a Receber', fim: true },
  { to: '/admin/financeiro/pagar', label: 'Contas a Pagar' },
  { to: '/admin/financeiro/fluxo-caixa', label: 'Fluxo de Caixa' },
  { to: '/admin/financeiro/comissoes', label: 'Comissões' },
  { to: '/admin/financeiro/relatorios', label: 'Relatórios' },
]

export function FinanceiroLayout() {
  return (
    <div>
      <SubNav itens={ITENS} />
      <Outlet />
    </div>
  )
}
