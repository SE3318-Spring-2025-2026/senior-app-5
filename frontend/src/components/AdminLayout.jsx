import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom'
import styles from './AdminLayout.module.css'
import { AdminGroupProvider } from '../context/AdminGroupContext'

function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  // Generate breadcrumb segments
  const generateBreadcrumbs = () => {
    const segments = location.pathname.split('/').filter(Boolean)
    const breadcrumbs = [
      { label: 'Home', path: '/dashboard', isActive: false }
    ]

    // Build cumulative paths
    let cumulativePath = ''
    segments.forEach((segment, index) => {
      cumulativePath += `/${segment}`
      const isLastSegment = index === segments.length - 1

      // Map segment names to display labels
      const segmentLabels = {
        admin: 'Admin',
        groups: 'Groups',
        members: 'Members',
        invites: 'Invites',
        advisors: 'Advisors',
        sanitization: 'Sanitization',
        professors: 'Professors',
        activity: 'Activity Logs',
      }

      const label = segmentLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
      
      breadcrumbs.push({
        label,
        path: segment === 'admin' ? '/admin/groups' : cumulativePath,
        isActive: isLastSegment,
      })
    })

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  const adminTabs = [
    { label: 'Groups', path: '/admin/groups' },
    { label: 'Members', path: '/admin/members' },
    { label: 'Invites', path: '/admin/invites' },
    { label: 'Advisors', path: '/admin/advisors' },
    { label: 'Sanitization', path: '/admin/sanitization' },
    { label: 'Professors', path: '/admin/professors' },
    { label: 'Activity Logs', path: '/admin/activity' },
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
              Manage groups, members, invites, advisors, sanitization, and activity logs.
            </p>
          </div>
        </header>

        {/* Breadcrumb Navigation */}
        <nav className={styles.breadcrumbNavigation} aria-label="Breadcrumb">
          <ul className={styles.breadcrumbList}>
            {breadcrumbs.map((crumb, index) => (
              <li key={crumb.path} className={styles.breadcrumbItem}>
                {crumb.isActive ? (
                  <span className={styles.breadcrumbCurrent}>{crumb.label}</span>
                ) : (
                  <>
                    <Link to={crumb.path} className={styles.breadcrumbLink}>
                      {crumb.label}
                    </Link>
                    <span className={styles.breadcrumbSeparator}>&gt;</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </nav>

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
