import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  Wallet,
  Megaphone,
  UserCog,
  Settings,
  Glasses,
  X,
} from 'lucide-react'

const itens = [
  { to: '/admin', fim: true, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/clientes', label: 'Clientes', icon: Users },
  { to: '/admin/vendas', label: 'Vendas / OS', icon: ShoppingCart },
  { to: '/admin/estoque', label: 'Estoque', icon: Package },
  { to: '/admin/financeiro', label: 'Financeiro', icon: Wallet },
  { to: '/admin/marketing', label: 'Marketing', icon: Megaphone },
  { to: '/admin/funcionarios', label: 'Funcionários', icon: UserCog },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings },
]

export function Sidebar({ aberta = false, aoFechar }) {
  return (
    <>
      {aberta && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/40 lg:hidden"
          onClick={aoFechar}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-shrink-0 -translate-x-full flex-col border-r border-gray-100 bg-white transition-transform duration-200 ease-out lg:static lg:z-auto lg:translate-x-0 ${
          aberta ? 'translate-x-0' : ''
        }`}
      >
        <div className="flex items-center justify-between gap-2.5 border-b border-gray-100 px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-soft">
              <Glasses size={18} />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-gray-900">Ótica Monte Sinai</p>
              <p className="text-xs text-gray-400">Painel administrativo</p>
            </div>
          </div>
          <button
            onClick={aoFechar}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600 lg:hidden"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          {itens.map(({ to, fim, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={fim}
              onClick={aoFechar}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={18}
                    strokeWidth={isActive ? 2.25 : 2}
                    className={isActive ? 'text-brand-600' : 'text-gray-400 group-hover:text-gray-600'}
                  />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}
