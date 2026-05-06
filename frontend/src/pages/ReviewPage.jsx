import { useCallback, useEffect, useMemo, useState } from 'react'
import SubmissionReviewPanel from '../components/reviews/SubmissionReviewPanel'
import { getCommittee, listCommittees } from '../utils/committeeService'
import { getSubmissionsForCommittee } from '../utils/reviewService'
import styles from './ReviewPage.module.css'

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

const normalizeStatusClass = (status) =>
  String(status || 'Pending')
    .toLowerCase()
    .replace(/\s+/g, '')

const getCommitteeId = (committee) => committee?.id || committee?.committeeId || committee?._id

const includesProfessor = (members, userId) =>
  Array.isArray(members) &&
  members.some((member) => String(member?.userId || member?.advisorUserId || member?.id) === String(userId))

const findProfessorCommittee = (committees, user) => {
  const userId = user?.userId || user?.id || user?._id
  if (!userId) return null

  return committees.find(
    (committee) => includesProfessor(committee?.jury, userId) || includesProfessor(committee?.advisors, userId),
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
    () => submissions.find((submission) => String(submission._id || submission.id || submission.submissionId) === String(selectedSubmissionId)),
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
        localUser.committeeId || localUser.assignedCommitteeId || localUser.committee?.id || localUser.committee?._id

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
      setSelectedSubmissionId(String(queue[0]?._id || queue[0]?.id || queue[0]?.submissionId || ''))
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
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Review</h1>
        <p className={styles.subtitle}>
          {committee?.name || committeeId || 'Committee'} assigned submissions
        </p>
      </header>

      {status.loading ? <div className={styles.status}>Loading review queue...</div> : null}
      {status.error ? <div className={`${styles.status} ${styles.error}`}>{status.error}</div> : null}

      {!status.loading && !status.error ? (
        <div className={styles.layout}>
          <section className={styles.list} aria-label="Assigned submissions">
            {submissions.length === 0 ? (
              <div className={styles.status}>No submissions assigned to this committee.</div>
            ) : (
              submissions.map((submission) => {
                const id = String(submission._id || submission.id || submission.submissionId)
                const statusName = submission.status || 'Pending'
                const badgeClass = styles[normalizeStatusClass(statusName)] || ''

                return (
                  <button
                    className={`${styles.card} ${selectedSubmissionId === id ? styles.selected : ''}`}
                    key={id}
                    onClick={() => setSelectedSubmissionId(id)}
                    type="button"
                  >
                    <h2>{submission.title || 'Untitled submission'}</h2>
                    <div className={styles.cardMeta}>
                      <span className={styles.type}>{submission.type || 'Submission'}</span>
                      <span className={`${styles.badge} ${badgeClass}`}>{statusName}</span>
                    </div>
                  </button>
                )
              })
            )}
          </section>

          <SubmissionReviewPanel
            committeeId={committeeId}
            currentUser={user}
            submission={selectedSubmission}
          />
        </div>
      ) : null}
    </main>
  )
}

export default ReviewPage
