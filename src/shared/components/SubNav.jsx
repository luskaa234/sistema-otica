import { NavLink } from 'react-router-dom'

export function SubNav({ itens }) {
  return (
    <div className="mb-7 flex gap-1 overflow-x-auto border-b border-gray-200">
      {itens.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.fim}
          className={({ isActive }) =>
            `whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:border-gray-200 hover:text-gray-800'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  )
}
