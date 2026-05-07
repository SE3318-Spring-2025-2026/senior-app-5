import { useCallback, useEffect, useMemo, useState } from 'react'
import SubmissionReviewPanel from '../components/reviews/SubmissionReviewPanel'
import { getCommittee, listCommittees } from '../utils/committeeService'
import { getSubmissionsForCommittee } from '../utils/reviewService'
import { PageHeader, Badge } from '../components/ui'

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

const normalizeStatusClass = (status) =>
  String(status || 'Pending')
    .toLowerCase()
    .replace(/\s+/g, '')

const STATUS_COLOR = {
  pending: 'yellow',
  underreview: 'blue',
  needsrevision: 'yellow',
  approved: 'green',
  rejected: 'red',
}

const statusColor = (status) => STATUS_COLOR[normalizeStatusClass(status)] || 'slate'

const getCommitteeId = (committee) => committee?.id || committee?.committeeId || committee?._id

const includesProfessor = (members, userId) =>
  Array.isArray(members) &&
  members.some(
    (member) =>
      String(member?.userId || member?.advisorUserId || member?.id) === String(userId),
  )

const findProfessorCommittee = (committees, user) => {
  const userId = user?.userId || user?.id || user?._id
  if (!userId) return null

  return committees.find(
    (committee) =>
      includesProfessor(committee?.jury, userId) ||
      includesProfessor(committee?.advisors, userId),
  )
}

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const ReviewPage = () => {
  const [user, setUser] = useState(null)
  const [committee, setCommittee] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [selectedSubmissionId, setSelectedSubmissionId] = useState('')
  const [status, setStatus] = useState({ loading: true, error: '' })

  const selectedSubmission = useMemo(
    () =>
      submissions.find(
        (submission) =>
          String(submission._id || submission.id || submission.submissionId) ===
          String(selectedSubmissionId),
      ),
    [selectedSubmissionId, submissions],
  )

  const loadReviewQueue = useCallback(async () => {
    const localUser = getStoredUser()
    setUser(localUser)

    if (!localUser) {
      setStatus({ loading: false, error: 'User session not found. Please sign in again.' })
      return
    }

    try {
      setStatus({ loading: true, error: '' })

      const directCommitteeId =
        localUser.committeeId ||
        localUser.assignedCommitteeId ||
        localUser.committee?.id ||
        localUser.committee?._id

      let professorCommittee = null
      if (directCommitteeId) {
        professorCommittee = await getCommittee(directCommitteeId)
      } else {
        const committees = normalizeList(await listCommittees({ page: 1, limit: 100 }))
        professorCommittee = findProfessorCommittee(committees, localUser) || committees[0] || null
      }

      const committeeId = getCommitteeId(professorCommittee)
      if (!committeeId) {
        setCommittee(null)
        setSubmissions([])
        setStatus({ loading: false, error: 'No committee assignment was found for this professor.' })
        return
      }

      const queue = normalizeList(await getSubmissionsForCommittee(committeeId))
      setCommittee(professorCommittee)
      setSubmissions(queue)
      setSelectedSubmissionId(
        String(queue[0]?._id || queue[0]?.id || queue[0]?.submissionId || ''),
      )
      setStatus({ loading: false, error: '' })
    } catch (error) {
      setStatus({
        loading: false,
        error: error.message || 'Unable to load review queue.',
      })
    }
  }, [])

  useEffect(() => {
    const task = window.setTimeout(loadReviewQueue, 0)
    return () => window.clearTimeout(task)
  }, [loadReviewQueue])

  const committeeId = getCommitteeId(committee)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review"
        subtitle={`${committee?.name || committeeId || 'Committee'} assigned submissions`}
      />

      {status.loading && (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-slate-500">Loading review queue...</p>
        </div>
      )}

      {status.error && (
        <div className="flex items-center gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400">
          {status.error}
        </div>
      )}

      {!status.loading && !status.error && (
        <div className="flex gap-5 items-start">
          <section
            className="overflow-hidden rounded-2xl border border-[#1e293b] w-72 shrink-0"
            aria-label="Assigned submissions"
          >
            {submissions.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                No submissions assigned to this committee.
              </div>
            ) : (
              submissions.map((submission) => {
                const id = String(submission._id || submission.id || submission.submissionId)
                const statusName = submission.status || 'Pending'
                const isSelected = selectedSubmissionId === id

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedSubmissionId(id)}
                    className={[
                      'w-full text-left px-4 py-3 border-b border-[#1e293b] hover:bg-white/[0.02] transition-colors',
                      isSelected
                        ? 'bg-blue-600/10 border-l-2 border-blue-500'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <p className="text-sm font-medium text-slate-200 truncate">
                      {submission.title || 'Untitled submission'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500">
                        {submission.type || 'Submission'}
                      </span>
                      <Badge color={statusColor(statusName)}>{statusName}</Badge>
                    </div>
                  </button>
                )
              })
            )}
          </section>

          <div className="flex-1">
            <SubmissionReviewPanel
              committeeId={committeeId}
              currentUser={user}
              submission={selectedSubmission}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default ReviewPage
