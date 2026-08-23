import { NavLink } from 'react-router-dom'

export function SubNav({ itens }) {
  return (
    <div className="mb-6 flex gap-1 border-b border-gray-200">
      {itens.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.fim}
          className={({ isActive }) =>
            `px-4 py-2 text-sm font-medium ${
              isActive ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-500 hover:text-gray-800'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  )
}
