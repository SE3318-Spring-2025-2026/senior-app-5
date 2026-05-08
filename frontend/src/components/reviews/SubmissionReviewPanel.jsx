import { useCallback, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { FileText, MessageSquare, GitPullRequest, Star, Trash2 } from 'lucide-react'
import apiConfig from '../../config/api'
import {
  addComment,
  createReview,
  deleteComment,
  getReview,
  requestRevision,
  submitGrade,
} from '../../utils/reviewService'
import { getGradingWindow } from '../../utils/scheduleService'
import { Badge } from '../ui'
import { openNativeDatePicker } from '../../utils/openPicker'

const getId = (value) => value?._id || value?.id || value?.reviewId || value?.commentId

const getAuthorId = (comment) =>
  comment?.authorUserId || comment?.userId || comment?.createdByUserId || comment?.author?.userId || comment?.author?.id

const getAuthorName = (comment) =>
  comment?.authorName || comment?.author?.name || comment?.author?.email || getAuthorId(comment) || 'Committee member'

const formatDateTime = (value) => {
  if (!value) return 'No date'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'No date' : date.toLocaleString()
}

const getDocumentHref = (submissionId, document, index) => {
  if (document?.downloadUrl || document?.url) return document.downloadUrl || document.url
  if (document?.storagePath) return document.storagePath
  const documentId = document?.documentId || document?._id || document?.id || index
  return `${apiConfig.baseURL}${apiConfig.endpoints.submissions.downloadDocument(submissionId, documentId)}`
}

const normalizeReview = (review) => ({ comments: [], revisionRequests: [], ...review })

const sectionClass = 'border-t border-[#1e293b] pt-5 mt-5'
const sectionHeadClass = 'mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-500'
const textareaClass =
  'w-full rounded-xl border border-[#1e293b] bg-[#111827] px-3 py-2 text-sm text-slate-200 ' +
  'placeholder:text-slate-600 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/30 resize-none'
const inputClass =
  'w-full rounded-xl border border-[#1e293b] bg-[#111827] px-3 py-2 text-sm text-slate-200 ' +
  'focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/30'
const btnPrimary =
  'rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 ' +
  'disabled:opacity-40 disabled:cursor-not-allowed transition-colors'

const SubmissionReviewPanel = ({ submission, committeeId, currentUser }) => {
  const [review, setReview] = useState(null)
  const [commentText, setCommentText] = useState('')
  const [revisionDescription, setRevisionDescription] = useState('')
  const [revisionDueDatetime, setRevisionDueDatetime] = useState('')
  const [grade, setGrade] = useState('')
  const [gradingWindow, setGradingWindow] = useState({ isOpen: false })
  const [status, setStatus] = useState({ loading: true, message: '', error: '' })
  const [saving, setSaving] = useState(false)

  const submissionId = submission?._id || submission?.id || submission?.submissionId
  const existingReviewId = submission?.reviewId || submission?.review?._id || submission?.review?.id
  const userId = currentUser?.userId || currentUser?.id || currentUser?._id
  const isSubmitted = review?.status === 'Submitted' || review?.grade !== undefined

  const documents = useMemo(() => submission?.documents || [], [submission])

  const loadGradingWindow = useCallback(async () => {
    try {
      const windowState = await getGradingWindow()
      setGradingWindow(windowState || { isOpen: false })
    } catch {
      setGradingWindow({ isOpen: false })
    }
  }, [])

  const loadReview = useCallback(async () => {
    if (!submissionId || !committeeId) return
    setStatus({ loading: true, message: '', error: '' })
    try {
      const data = existingReviewId
        ? await getReview(existingReviewId)
        : await createReview(submissionId, committeeId)
      setReview(normalizeReview(data))
      setGrade(data?.grade ?? '')
      setStatus({ loading: false, message: '', error: '' })
    } catch (error) {
      setStatus({ loading: false, message: '', error: error.message || 'Unable to load review.' })
    }
  }, [committeeId, existingReviewId, submissionId])

  useEffect(() => { loadReview() }, [loadReview])

  useEffect(() => {
    loadGradingWindow()
    const timer = window.setInterval(loadGradingWindow, 30000)
    return () => window.clearInterval(timer)
  }, [loadGradingWindow])

  const refreshReview = async (nextReviewId = getId(review)) => {
    if (!nextReviewId) return
    const data = await getReview(nextReviewId)
    setReview(normalizeReview(data))
    setGrade(data?.grade ?? '')
  }

  const handleAddComment = async (event) => {
    event.preventDefault()
    if (!commentText.trim() || !review) return
    setSaving(true)
    try {
      await addComment(getId(review), commentText.trim())
      setCommentText('')
      await refreshReview()
      setStatus({ loading: false, message: 'Comment added.', error: '' })
    } catch (error) {
      setStatus({ loading: false, message: '', error: error.message || 'Unable to add comment.' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!review || !commentId) return
    setSaving(true)
    try {
      await deleteComment(getId(review), commentId)
      await refreshReview()
      setStatus({ loading: false, message: 'Comment deleted.', error: '' })
    } catch (error) {
      setStatus({ loading: false, message: '', error: error.message || 'Unable to delete comment.' })
    } finally {
      setSaving(false)
    }
  }

  const handleRevisionRequest = async (event) => {
    event.preventDefault()
    if (!revisionDescription.trim() || !revisionDueDatetime || !review) return
    setSaving(true)
    try {
      await requestRevision(getId(review), revisionDescription.trim(), new Date(revisionDueDatetime).toISOString())
      setRevisionDescription('')
      setRevisionDueDatetime('')
      await refreshReview()
      setStatus({ loading: false, message: 'Revision requested.', error: '' })
    } catch (error) {
      setStatus({ loading: false, message: '', error: error.message || 'Unable to request revision.' })
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitGrade = async (event) => {
    event.preventDefault()
    if (!review || grade === '') return
    setSaving(true)
    try {
      const updated = await submitGrade(getId(review), Number(grade))
      setReview(normalizeReview(updated))
      setStatus({ loading: false, message: 'Grade submitted.', error: '' })
    } catch (error) {
      setStatus({ loading: false, message: '', error: error.message || 'Unable to submit grade.' })
    } finally {
      setSaving(false)
    }
  }

  if (!submission) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Select a submission to begin review.
      </div>
    )
  }

  return (
    <section className="flex-1 overflow-y-auto p-5" aria-label="Submission review panel">
      {/* Header */}
      <header className="mb-4">
        <h2 className="text-base font-bold text-slate-100">
          {submission.title || 'Untitled submission'}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {submission.type || 'Submission'} ·{' '}
          <Badge color={
            (submission.status || review?.status) === 'Approved' ? 'green' :
            (submission.status || review?.status) === 'NeedsRevision' ? 'yellow' :
            (submission.status || review?.status) === 'Rejected' ? 'red' : 'slate'
          }>
            {submission.status || review?.status || 'Pending'}
          </Badge>
        </p>
      </header>

      {/* Status feedback */}
      {status.loading && <p className="text-sm text-slate-500">Loading review…</p>}
      {status.error && (
        <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {status.error}
        </div>
      )}
      {status.message && !status.error && (
        <div className="mb-3 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-400">
          {status.message}
        </div>
      )}

      {/* Documents */}
      <section className={sectionClass}>
        <h3 className={sectionHeadClass}>
          <FileText size={13} /> Documents
        </h3>
        {documents.length === 0 ? (
          <p className="text-sm text-slate-500">No documents attached.</p>
        ) : (
          <ul className="space-y-2">
            {documents.map((document, index) => (
              <li
                key={getId(document) || index}
                className="flex items-center justify-between rounded-lg border border-[#1e293b] bg-white/[0.02] px-3 py-2"
              >
                <a
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  href={getDocumentHref(submissionId, document, index)}
                  rel="noreferrer"
                  target="_blank"
                >
                  {document.originalName || document.fileName || `Document ${index + 1}`}
                </a>
                <span className="text-xs text-slate-600">{formatDateTime(document.uploadedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Comments */}
      <section className={sectionClass}>
        <h3 className={sectionHeadClass}>
          <MessageSquare size={13} /> Comments
        </h3>

        {review?.comments?.length ? (
          <ul className="mb-4 space-y-3">
            {review.comments.map((comment) => {
              const commentId = getId(comment)
              const ownsComment = userId && String(getAuthorId(comment)) === String(userId)
              return (
                <li
                  key={commentId}
                  className="rounded-xl border border-[#1e293b] bg-white/[0.02] p-3"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">{getAuthorName(comment)}</span>
                    <span className="text-xs text-slate-600">{formatDateTime(comment.createdAt)}</span>
                  </div>
                  <p className="text-sm text-slate-400">{comment.text}</p>
                  {ownsComment && (
                    <button
                      className="mt-2 flex items-center gap-1 text-xs text-red-400 hover:text-red-300 disabled:opacity-40 transition-colors"
                      disabled={saving}
                      onClick={() => handleDeleteComment(commentId)}
                      type="button"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-slate-500">No comments yet.</p>
        )}

        <form className="space-y-2" onSubmit={handleAddComment}>
          <textarea
            aria-label="Comment text"
            className={textareaClass}
            rows={3}
            onChange={(event) => setCommentText(event.target.value)}
            placeholder="Add a comment…"
            value={commentText}
          />
          <button className={btnPrimary} disabled={saving || !commentText.trim()} type="submit">
            Add Comment
          </button>
        </form>
      </section>

      {/* Revision Requests */}
      <section className={sectionClass}>
        <h3 className={sectionHeadClass}>
          <GitPullRequest size={13} /> Revision Requests
        </h3>

        <form className="mb-4 space-y-2" onSubmit={handleRevisionRequest}>
          <textarea
            aria-label="Revision description"
            className={textareaClass}
            rows={3}
            onChange={(event) => setRevisionDescription(event.target.value)}
            placeholder="Describe the requested revision…"
            value={revisionDescription}
          />
          <input
            aria-label="Revision due datetime"
            className={inputClass}
            onClick={openNativeDatePicker}
            onChange={(event) => setRevisionDueDatetime(event.target.value)}
            type="datetime-local"
            value={revisionDueDatetime}
          />
          <button
            className={btnPrimary}
            disabled={saving || !revisionDescription.trim() || !revisionDueDatetime}
            type="submit"
          >
            Request Revision
          </button>
        </form>

        {review?.revisionRequests?.length ? (
          <ul className="space-y-3">
            {review.revisionRequests.map((request, index) => (
              <li
                key={getId(request) || index}
                className="rounded-xl border border-[#1e293b] bg-white/[0.02] p-3"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">
                    Due {formatDateTime(request.dueDatetime)}
                  </span>
                  <Badge color={
                    ['Resolved', 'Closed', 'Completed'].includes(request.status) ? 'green' : 'yellow'
                  }>
                    {request.status || 'Active'}
                  </Badge>
                </div>
                <p className="text-sm text-slate-400">{request.description}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No revision requests.</p>
        )}
      </section>

      {/* Grade */}
      <section className={sectionClass}>
        <h3 className={sectionHeadClass}>
          <Star size={13} /> Grade
        </h3>
        {!gradingWindow?.isOpen && (
          <p className="mb-3 text-xs text-yellow-400">Grading window is currently closed.</p>
        )}
        {isSubmitted ? (
          <div className="inline-flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2">
            <span className="text-sm font-bold text-green-400">{review?.grade}</span>
            <span className="text-xs text-slate-500">/ 100 — submitted</span>
          </div>
        ) : (
          <form className="flex items-center gap-3" onSubmit={handleSubmitGrade}>
            <input
              aria-label="Grade"
              className="w-24 rounded-xl border border-[#1e293b] bg-[#111827] px-3 py-2 text-sm text-slate-200
                         focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/30
                         disabled:opacity-40"
              disabled={!gradingWindow?.isOpen || saving}
              max="100"
              min="0"
              onChange={(event) => setGrade(event.target.value)}
              title={!gradingWindow?.isOpen ? 'Grading window is currently closed' : undefined}
              type="number"
              value={grade}
            />
            <button
              className={btnPrimary}
              disabled={!gradingWindow?.isOpen || saving || grade === ''}
              title={!gradingWindow?.isOpen ? 'Grading window is currently closed' : undefined}
              type="submit"
            >
              Submit Grade
            </button>
          </form>
        )}
      </section>
    </section>
  )
}

SubmissionReviewPanel.propTypes = {
  committeeId: PropTypes.string,
  currentUser: PropTypes.shape({
    _id: PropTypes.string,
    id: PropTypes.string,
    userId: PropTypes.string,
  }),
  submission: PropTypes.shape({
    _id: PropTypes.string,
    documents: PropTypes.arrayOf(PropTypes.object),
    id: PropTypes.string,
    review: PropTypes.object,
    reviewId: PropTypes.string,
    status: PropTypes.string,
    submissionId: PropTypes.string,
    title: PropTypes.string,
    type: PropTypes.string,
  }),
}

export default SubmissionReviewPanel
