import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText } from 'lucide-react'
import apiClient from '../utils/apiClient'
import apiConfig from '../config/api'
import { PageHeader, Badge } from '../components/ui'

const STATUS_COLOR = {
  pending: 'yellow',
  underreview: 'blue',
  needsrevision: 'yellow',
  approved: 'green',
  rejected: 'red',
}

const statusColor = (status) =>
  STATUS_COLOR[String(status || '').toLowerCase().replace(/\s+/g, '')] || 'slate'

const DocumentsPage = () => {
  const navigate = useNavigate()
  const [submissions, setSubmissions] = useState([])
  const [status, setStatus] = useState({ loading: true, error: '' })

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const userStr = localStorage.getItem('user')
        const localUser = userStr ? JSON.parse(userStr) : null

        if (!localUser) {
          setStatus({ loading: false, error: 'User session not found. Please log in again.' })
          return
        }

        let endpoint = apiConfig.endpoints.submissions.list
        const userGroupId = localUser.teamId || localUser.groupId

        if (localUser.role === 'Student' || localUser.role === 'TeamLeader') {
          if (!userGroupId) {
            setStatus({
              loading: false,
              error: 'You are not assigned to any group yet. Please contact your coordinator.',
            })
            return
          }
          endpoint = apiConfig.endpoints.submissions.byGroup(userGroupId)
        } else if (
          localUser.role !== 'Coordinator' &&
          localUser.role !== 'Professor' &&
          localUser.role !== 'Admin'
        ) {
          setStatus({ loading: false, error: 'Unrecognized user role. Access denied.' })
          return
        }
        // Professor, Coordinator, Admin: use the full list endpoint (no filter)

        const response = await apiClient.get(endpoint)
        setSubmissions(response.data)
        setStatus({ loading: false, error: '' })
      } catch (error) {
        console.error('Fetch error:', error)
        const details =
          error.response?.data?.message || 'Failed to load documents from the server.'
        setStatus({ loading: false, error: details })
      }
    }

    fetchSubmissions()
  }, [])

  if (status.loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-slate-500">Loading documents...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents & Submissions"
        subtitle="View and manage project submissions."
      />

      {status.error && (
        <div className="flex items-center gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400">
          {status.error}
        </div>
      )}

      {!status.error && submissions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <FileText className="h-8 w-8 text-slate-600" />
          <p className="text-sm text-slate-500">
            No submissions found. When you upload a document, it will appear here.
          </p>
        </div>
      ) : (
        !status.error && (
          <div className="overflow-hidden rounded-2xl border border-[#1e293b]">
            <table className="w-full">
              <thead>
                <tr className="bg-[#080f1f]">
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Document Title
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Submitted Date
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr
                    key={sub._id}
                    className="border-t border-[#1e293b] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-200 font-medium">{sub.title}</td>
                    <td className="px-4 py-3 text-slate-300">{sub.type ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge color={statusColor(sub.status)}>{sub.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {sub.submittedAt || sub.createdAt
                        ? new Date(sub.submittedAt || sub.createdAt).toLocaleDateString()
                        : 'No Date'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="rounded-xl border border-[#1e293b] bg-[#111827] px-4 py-2.5 text-sm font-bold text-slate-300 hover:border-slate-600 hover:text-slate-100"
                        onClick={() => navigate(`/documents/${sub._id}`)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}

export default DocumentsPage
