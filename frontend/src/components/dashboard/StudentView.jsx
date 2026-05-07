import { useEffect, useMemo, useState } from 'react';
import apiClient from '../../utils/apiClient';
import apiConfig from '../../config/api';
import { getReview } from '../../utils/reviewService';
import styles from '../../pages/DashboardPage.module.css'; 
import SubmissionChecklist from '../SubmissionChecklist';

const StudentView = ({ user }) => {
  const [feedbackState, setFeedbackState] = useState({ loading: true, error: '' });
  const [reviews, setReviews] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const updateCurrentTime = () => setCurrentTime(Date.now());
    updateCurrentTime();
    const timer = window.setInterval(updateCurrentTime, 60000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadFeedback = async () => {
      const groupId = user?.teamId || user?.groupId;
      if (!groupId) {
        setFeedbackState({ loading: false, error: 'No active group found for feedback.' });
        setReviews([]);
        return;
      }

      try {
        setFeedbackState({ loading: true, error: '' });
        const response = await apiClient.get(apiConfig.endpoints.submissions.byGroup(groupId));
        const submissions = Array.isArray(response.data) ? response.data : response.data?.data || [];
        const activeSubmission =
          submissions.find((submission) => ['UnderReview', 'NeedsRevision', 'Pending'].includes(submission.status)) ||
          submissions[0];

        if (!activeSubmission) {
          setReviews([]);
          setFeedbackState({ loading: false, error: '' });
          return;
        }

        const embeddedReviews = Array.isArray(activeSubmission.reviews) ? activeSubmission.reviews : [];
        const reviewIds = [
          activeSubmission.reviewId,
          ...(Array.isArray(activeSubmission.reviewIds) ? activeSubmission.reviewIds : []),
        ].filter(Boolean);

        const loadedReviews = reviewIds.length
          ? await Promise.all(reviewIds.map((reviewId) => getReview(reviewId)))
          : embeddedReviews;

        setReviews(loadedReviews);
        setFeedbackState({ loading: false, error: '' });
      } catch (error) {
        setReviews([]);
        setFeedbackState({
          loading: false,
          error: error.message || 'Unable to load feedback.',
        });
      }
    };

    loadFeedback();
  }, [user]);

  const comments = useMemo(
    () => reviews.flatMap((review) => review?.comments || []),
    [reviews],
  );

  const revisionRequests = useMemo(
    () =>
      reviews
        .flatMap((review) => review?.revisionRequests || [])
        .filter((request) => !request.status || !['Resolved', 'Closed', 'Completed'].includes(request.status)),
    [reviews],
  );

  const formatDate = (value) => {
    if (!value) return 'No due date';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'No due date' : date.toLocaleString();
  };

  return (
    <div className={styles.roleContainer}> 
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.cardTitle}>My Groups</div>
          <div className={styles.cardValue}>1 Active</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.cardTitle}>Pending Invites</div>
          <div className={styles.cardValue}>3 New</div>
        </div>
      </div>


      <SubmissionChecklist />

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.cardTitle}>Feedback</div>
          {feedbackState.loading ? (
            <div className={styles.cardValue}>Loading</div>
          ) : feedbackState.error ? (
            <p>{feedbackState.error}</p>
          ) : comments.length === 0 ? (
            <p>No feedback has been posted yet.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '18px' }}>
              {comments.map((comment, index) => (
                <li key={comment.id || comment._id || index} style={{ marginBottom: '10px' }}>
                  <strong>{comment.authorName || comment.author?.name || 'Reviewer'}:</strong> {comment.text}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.statCard}>
          <div className={styles.cardTitle}>Revision Requests</div>
          {feedbackState.loading ? (
            <div className={styles.cardValue}>Loading</div>
          ) : revisionRequests.length === 0 ? (
            <p>No active revision requests.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '18px' }}>
              {revisionRequests.map((request, index) => {
                const isPastDue = request.dueDatetime && new Date(request.dueDatetime).getTime() < currentTime;

                return (
                  <li key={request.id || request._id || index} style={{ marginBottom: '10px' }}>
                    <div>{request.description}</div>
                    <strong style={{ color: isPastDue ? '#ef4444' : '#94a3b8' }}>
                      Due {formatDate(request.dueDatetime)}
                    </strong>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      
    </div>
  );
};

export default StudentView;
