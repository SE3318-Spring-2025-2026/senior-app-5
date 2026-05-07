import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { AdminGroupProvider } from '../context/AdminGroupContext'

const adminTabs = [
  { label: 'Groups', path: '/admin/groups' },
  { label: 'Members', path: '/admin/members' },
  { label: 'Invites', path: '/admin/invites' },
  { label: 'Advisors', path: '/admin/advisors' },
  { label: 'Committees', path: '/admin/committees' },
  { label: 'Sanitization', path: '/admin/sanitization' },
  { label: 'Professors', path: '/admin/professors' },
  { label: 'Activity Logs', path: '/admin/activity' },
]

function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  return (
    <AdminGroupProvider>
      <div>
        <nav className="flex gap-1 rounded-xl border border-[#1e293b] bg-[#080f1f] p-1 mb-6">
          {adminTabs.map((tab) => (
            <button
              key={tab.path}
              type="button"
              onClick={() => navigate(tab.path)}
              className={[
                'flex-1 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors',
                isActive(tab.path)
                  ? 'bg-blue-600/15 text-blue-400'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <Outlet />
      </div>
    </AdminGroupProvider>
  )
}

export default AdminLayout
