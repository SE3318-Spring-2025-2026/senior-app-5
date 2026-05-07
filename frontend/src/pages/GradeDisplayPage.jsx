import { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';
import styles from './DocumentsPage.module.css';

const HISTORY_ROLES = new Set(['Coordinator', 'Admin']);
const GROUP_GRADE_ROLES = new Set(['Coordinator', 'Admin', 'Professor']);
const HISTORY_LIMIT = 20;

function GradeDisplayPage() {
  const navigate = useNavigate();
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  // Student-specific state
  const [studentGrade, setStudentGrade] = useState(null);
  const [studentStatus, setStudentStatus] = useState({ loading: false, error: '', notFound: false });

  // Staff-specific state
  const [groupIdInput, setGroupIdInput] = useState('');
  const [groupGrade, setGroupGrade] = useState(null);
  const [groupStatus, setGroupStatus] = useState({ loading: false, error: '', notFound: false });

  // Grade history state (Coordinator / Admin only)
  const [history, setHistory] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyStatus, setHistoryStatus] = useState({ loading: false, error: '', notFound: false });

  // Expandable gradeComponents rows
  const [expandedRows, setExpandedRows] = useState(new Set());

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role === 'Student') {
      const fetchStudentGrade = async () => {
        setStudentStatus({ loading: true, error: '', notFound: false });
        try {
          const response = await apiClient.get(
            apiConfig.endpoints.studentFinalGrade(user.id),
          );
          setStudentGrade(response.data);
          setStudentStatus({ loading: false, error: '', notFound: false });
        } catch (error) {
          if (error.response?.status === 404) {
            setStudentStatus({ loading: false, error: '', notFound: true });
          } else if (error.response?.status === 403) {
            setStudentStatus({
              loading: false,
              error: 'You are not allowed to view this grade.',
              notFound: false,
            });
          } else {
            setStudentStatus({ loading: false, error: 'Failed to load grade data.', notFound: false });
          }
        }
      };
      fetchStudentGrade();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchGroupGrade = async (e) => {
    e.preventDefault();
    setGroupGrade(null);
    setHistory(null);
    setExpandedRows(new Set());
    setGroupStatus({ loading: true, error: '', notFound: false });
    setHistoryStatus({ loading: false, error: '', notFound: false });

    const gId = groupIdInput.trim();

    try {
      const response = await apiClient.get(apiConfig.endpoints.groupFinalGrade(gId));
      setGroupGrade(response.data);
      setGroupStatus({ loading: false, error: '', notFound: false });

      if (HISTORY_ROLES.has(user.role)) {
        await fetchGradeHistory(gId, 1);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setGroupStatus({ loading: false, error: '', notFound: true });
      } else if (error.response?.status === 403) {
        setGroupStatus({
          loading: false,
          error: "You do not have permission to view this group's grade.",
          notFound: false,
        });
      } else {
        setGroupStatus({ loading: false, error: 'Failed to load group grade.', notFound: false });
      }
    }
  };

  const fetchGradeHistory = async (gId, page) => {
    setHistoryStatus({ loading: true, error: '', notFound: false });
    try {
      const response = await apiClient.get(
        `${apiConfig.endpoints.groupGradeHistory(gId)}?page=${page}&limit=${HISTORY_LIMIT}`,
      );
      setHistory(response.data);
      setHistoryPage(page);
      setHistoryStatus({ loading: false, error: '', notFound: false });
    } catch (error) {
      if (error.response?.status === 404) {
        setHistoryStatus({ loading: false, error: '', notFound: true });
      } else {
        setHistoryStatus({ loading: false, error: 'Failed to load grade history.', notFound: false });
      }
    }
  };

  const toggleRow = (id) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!user) return null;

  // ── STUDENT VIEW ────────────────────────────────────────────────────────────
  if (user.role === 'Student') {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.headerSection}>
          <h1 className={styles.title}>MY GRADE</h1>
          <p className={styles.description}>Your individual final grade.</p>
        </div>

        {studentStatus.loading && (
          <div className={styles.loading}>Loading your grade...</div>
        )}

        {studentStatus.error && (
          <div className={styles.errorBox}>{studentStatus.error}</div>
        )}

        {studentStatus.notFound && (
          <div className={styles.infoBox}>
            <p>No grade available yet. Grade has not been calculated.</p>
          </div>
        )}

        {studentGrade && (
          <div className={styles.tableWrapper}>
            <table className={styles.customTable}>
              <thead>
                <tr>
                  <th>Final Grade</th>
                  <th>Allowance Ratio</th>
                  <th>Calculated At</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{studentGrade.finalGrade?.toFixed(2)}</td>
                  <td>{(studentGrade.individualAllowanceRatio * 100).toFixed(0)}%</td>
                  <td>{new Date(studentGrade.calculatedAt).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ── STAFF VIEW (Coordinator / Admin / Professor) ─────────────────────────────
  if (!GROUP_GRADE_ROLES.has(user.role)) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.errorBox}>
          You do not have permission to access this page.
        </div>
      </div>
    );
  }

  const totalHistoryPages = history ? Math.ceil(history.total / HISTORY_LIMIT) : 1;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.headerSection}>
        <h1 className={styles.title}>GRADE DISPLAY</h1>
        <p className={styles.description}>View final grades and history for a group.</p>
      </div>

      {/* Group ID lookup form */}
      <form
        onSubmit={fetchGroupGrade}
        style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}
      >
        <input
          value={groupIdInput}
          onChange={(e) => setGroupIdInput(e.target.value)}
          placeholder="Enter Group ID (UUID)"
          required
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '6px',
            background: '#0f172a',
            border: '1px solid #334155',
            color: '#f8fafc',
          }}
        />
        <button
          type="submit"
          disabled={groupStatus.loading}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            background: '#38bdf8',
            color: '#0f172a',
            fontWeight: 700,
            border: 'none',
            cursor: groupStatus.loading ? 'not-allowed' : 'pointer',
          }}
        >
          {groupStatus.loading ? 'Loading…' : 'View Grade'}
        </button>
      </form>

      {groupStatus.error && (
        <div className={styles.errorBox}>{groupStatus.error}</div>
      )}

      {groupStatus.notFound && (
        <div className={styles.infoBox}>
          <p>No grade available yet for this group.</p>
        </div>
      )}

      {/* Group Final Grade + Individual Grades */}
      {groupGrade && (
        <div className={styles.tableWrapper} style={{ marginBottom: '24px' }}>
          <h3 style={{ color: '#f8fafc', marginBottom: '16px' }}>
            Team Grade:{' '}
            <span style={{ color: '#38bdf8' }}>{groupGrade.teamGrade?.toFixed(2)}</span>
            <span style={{ color: '#64748b', fontSize: '0.85rem', marginLeft: '16px' }}>
              Calculated: {new Date(groupGrade.calculatedAt).toLocaleString()}
            </span>
          </h3>
          <table className={styles.customTable}>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Final Grade</th>
                <th>Allowance Ratio</th>
                <th>Calculated At</th>
              </tr>
            </thead>
            <tbody>
              {groupGrade.individualGrades.map((ig) => (
                <tr key={ig.studentId}>
                  <td>{ig.studentId}</td>
                  <td>{ig.finalGrade?.toFixed(2)}</td>
                  <td>{(ig.individualAllowanceRatio * 100).toFixed(0)}%</td>
                  <td>{new Date(ig.calculatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grade History — Coordinator / Admin only */}
      {HISTORY_ROLES.has(user.role) && groupGrade && (
        <section aria-label="Grade History">
          <h2 style={{ color: '#f8fafc', marginBottom: '16px' }}>Grade History</h2>

          {historyStatus.loading && (
            <div className={styles.loading}>Loading history...</div>
          )}
          {historyStatus.error && (
            <div className={styles.errorBox}>{historyStatus.error}</div>
          )}
          {historyStatus.notFound && (
            <div className={styles.infoBox}><p>No grade history available.</p></div>
          )}

          {history && history.data.length === 0 && (
            <div className={styles.infoBox}><p>No grade history available.</p></div>
          )}

          {history && history.data.length > 0 && (
            <>
              <div className={styles.tableWrapper}>
                <table className={styles.customTable}>
                  <thead>
                    <tr>
                      <th></th>
                      <th>Team Grade</th>
                      <th>Triggered By</th>
                      <th>Changed At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.data.map((entry) => (
                      <Fragment key={entry.gradeChangeId}>
                        <tr>
                          <td>
                            <button
                              onClick={() => toggleRow(entry.gradeChangeId)}
                              aria-expanded={expandedRows.has(entry.gradeChangeId)}
                              aria-label="Toggle grade components"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#38bdf8',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                              }}
                            >
                              {expandedRows.has(entry.gradeChangeId) ? '▲' : '▼'}
                            </button>
                          </td>
                          <td>{entry.teamGrade?.toFixed(2)}</td>
                          <td>{entry.triggeredBy}</td>
                          <td>{new Date(entry.changedAt).toLocaleString()}</td>
                        </tr>
                        {expandedRows.has(entry.gradeChangeId) && (
                          <tr key={`${entry.gradeChangeId}-detail`}>
                            <td colSpan={4}>
                              <pre
                                style={{
                                  background: '#1e293b',
                                  padding: '10px',
                                  borderRadius: '6px',
                                  color: '#94a3b8',
                                  fontSize: '0.8rem',
                                  overflow: 'auto',
                                }}
                              >
                                {JSON.stringify(entry.gradeComponents, null, 2)}
                              </pre>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginTop: '16px',
                  color: '#94a3b8',
                }}
              >
                <button
                  onClick={() => fetchGradeHistory(groupIdInput.trim(), historyPage - 1)}
                  disabled={historyPage <= 1}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    cursor: historyPage <= 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Previous
                </button>
                <span>
                  Page {historyPage} of {totalHistoryPages}
                </span>
                <button
                  onClick={() => fetchGradeHistory(groupIdInput.trim(), historyPage + 1)}
                  disabled={historyPage >= totalHistoryPages}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    cursor: historyPage >= totalHistoryPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

export default GradeDisplayPage;
