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
        <nav className="mb-6 flex gap-1 rounded-xl border border-[#1f1f23] bg-[#0e0e10] p-1">
          {adminTabs.map((tab) => (
            <button
              key={tab.path}
              type="button"
              onClick={() => navigate(tab.path)}
              className={[
                'flex-1 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors',
                isActive(tab.path)
                  ? 'bg-[#18181c] text-zinc-100'
                  : 'text-zinc-500 hover:bg-[#18181c] hover:text-zinc-300',
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
