import { useCallback, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
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
import styles from './SubmissionReviewPanel.module.css'

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

const normalizeReview = (review) => ({
  comments: [],
  revisionRequests: [],
  ...review,
})

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
      setStatus({
        loading: false,
        message: '',
        error: error.message || 'Unable to load review.',
      })
    }
  }, [committeeId, existingReviewId, submissionId])

  useEffect(() => {
    loadReview()
  }, [loadReview])

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
    return <div className={styles.panel}>Select a submission to begin review.</div>
  }

  return (
    <section className={styles.panel} aria-label="Submission review panel">
      <header className={styles.header}>
        <h2>{submission.title || 'Untitled submission'}</h2>
        <div className={styles.meta}>
          {submission.type || 'Submission'} · {submission.status || review?.status || 'Pending'}
        </div>
      </header>

      {status.loading ? <div className={styles.meta}>Loading review...</div> : null}
      {status.error ? <div className={`${styles.status} ${styles.error}`}>{status.error}</div> : null}
      {status.message ? <div className={`${styles.status} ${styles.success}`}>{status.message}</div> : null}

      <section className={styles.section}>
        <h3>Documents</h3>
        {documents.length === 0 ? (
          <p className={styles.empty}>No documents attached.</p>
        ) : (
          <ul className={styles.documentList}>
            {documents.map((document, index) => (
              <li key={getId(document) || index} className={styles.documentItem}>
                <a
                  className={styles.documentLink}
                  href={getDocumentHref(submissionId, document, index)}
                  rel="noreferrer"
                  target="_blank"
                >
                  {document.originalName || document.fileName || `Document ${index + 1}`}
                </a>
                <span className={styles.timestamp}> {formatDateTime(document.uploadedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h3>Comments</h3>
        {review?.comments?.length ? (
          <ul className={styles.itemList}>
            {review.comments.map((comment) => {
              const commentId = getId(comment)
              const ownsComment = userId && String(getAuthorId(comment)) === String(userId)

              return (
                <li key={commentId} className={styles.comment}>
                  <div className={styles.commentHeader}>
                    <strong>{getAuthorName(comment)}</strong>
                    <span className={styles.timestamp}>{formatDateTime(comment.createdAt)}</span>
                  </div>
                  <p className={styles.commentBody}>{comment.text}</p>
                  {ownsComment ? (
                    <button
                      className={styles.dangerButton}
                      disabled={saving}
                      onClick={() => handleDeleteComment(commentId)}
                      type="button"
                    >
                      Delete
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className={styles.empty}>No comments yet.</p>
        )}

        <form className={styles.form} onSubmit={handleAddComment}>
          <textarea
            aria-label="Comment text"
            className={styles.textarea}
            onChange={(event) => setCommentText(event.target.value)}
            placeholder="Add a comment"
            value={commentText}
          />
          <button className={styles.button} disabled={saving || !commentText.trim()} type="submit">
            Add Comment
          </button>
        </form>
      </section>

      <section className={styles.section}>
        <h3>Revision Requests</h3>
        <form className={styles.form} onSubmit={handleRevisionRequest}>
          <textarea
            aria-label="Revision description"
            className={styles.textarea}
            onChange={(event) => setRevisionDescription(event.target.value)}
            placeholder="Describe the requested revision"
            value={revisionDescription}
          />
          <input
            aria-label="Revision due datetime"
            className={styles.input}
            onChange={(event) => setRevisionDueDatetime(event.target.value)}
            type="datetime-local"
            value={revisionDueDatetime}
          />
          <button
            className={styles.button}
            disabled={saving || !revisionDescription.trim() || !revisionDueDatetime}
            type="submit"
          >
            Request Revision
          </button>
        </form>

        {review?.revisionRequests?.length ? (
          <ul className={styles.itemList}>
            {review.revisionRequests.map((request, index) => (
              <li key={getId(request) || index} className={styles.revision}>
                <div className={styles.revisionHeader}>
                  <strong>Due {formatDateTime(request.dueDatetime)}</strong>
                  <span className={styles.timestamp}>{request.status || 'Active'}</span>
                </div>
                <p className={styles.revisionBody}>{request.description}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>No revision requests.</p>
        )}
      </section>

      <section className={styles.section}>
        <h3>Grade</h3>
        {isSubmitted ? (
          <div className={styles.gradeDisplay}>Submitted grade: {review?.grade}</div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmitGrade}>
            <div className={styles.formRow}>
              <input
                aria-label="Grade"
                className={styles.input}
                disabled={!gradingWindow?.isOpen || saving}
                max="100"
                min="0"
                onChange={(event) => setGrade(event.target.value)}
                title={!gradingWindow?.isOpen ? 'Grading window is currently closed' : undefined}
                type="number"
                value={grade}
              />
              <button
                className={styles.button}
                disabled={!gradingWindow?.isOpen || saving || grade === ''}
                title={!gradingWindow?.isOpen ? 'Grading window is currently closed' : undefined}
                type="submit"
              >
                Submit Grade
              </button>
            </div>
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
