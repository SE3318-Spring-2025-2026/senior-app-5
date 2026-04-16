import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import styles from './AdminLayout.module.css'
import { AdminGroupProvider } from '../context/AdminGroupContext'

function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  const adminTabs = [
    { label: 'Groups', path: '/admin/groups' },
    { label: 'Members', path: '/admin/members' },
    { label: 'Invites', path: '/admin/invites' },
    { label: 'Advisors', path: '/admin/advisors' },
    { label: 'Sanitization', path: '/admin/sanitization' },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <AdminGroupProvider>
      <div className={styles.layoutContainer}>
        <header className={styles.hero}>
          <div>
            <p className={styles.badge}>Admin Control Panel</p>
            <h1>Coordinator Admin Panel</h1>
            <p className={styles.lead}>
              Manage groups, members, invites, advisors, and sanitization.
            </p>
          </div>
        </header>

        <nav className={styles.tabNavigation}>
          <ul className={styles.tabList}>
            {adminTabs.map((tab) => (
              <li key={tab.path}>
                <button
                  className={`${styles.tabButton} ${isActive(tab.path) ? styles.activeTab : ''}`}
                  onClick={() => navigate(tab.path)}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <main className={styles.contentContainer}>
          <Outlet />
        </main>
      </div>
    </AdminGroupProvider>
  )
}

export default AdminLayout
