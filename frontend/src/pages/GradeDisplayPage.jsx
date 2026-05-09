import { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';
import styles from './DocumentsPage.module.css';
import EntitySearchSelect from '../components/EntitySearchSelect';

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
  const [studentBreakdown, setStudentBreakdown] = useState(null);

  // Staff-specific state
  const [groupIdInput, setGroupIdInput] = useState('');
  const [groupGrade, setGroupGrade] = useState(null);
  const [groupStatus, setGroupStatus] = useState({ loading: false, error: '', notFound: false });

  // Grade history state (Coordinator / Admin / Student for own group)
  const [history, setHistory] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyStatus, setHistoryStatus] = useState({ loading: false, error: '', notFound: false });

  // Deliverable name map (resolved lazily for breakdown display)
  const [deliverableNameMap, setDeliverableNameMap] = useState({});

  // Expandable gradeComponents rows
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [studentEmailMap, setStudentEmailMap] = useState({});

  // Calculate grades state (Coordinator only)
  const [calcGroupInput, setCalcGroupInput] = useState('');
  const [calcForce, setCalcForce] = useState(false);
  const [calcStatus, setCalcStatus] = useState({ loading: false, error: '', result: null });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role === 'Student' || user.role === 'TeamLeader') {
      const fetchStudentGrade = async () => {
        setStudentStatus({ loading: true, error: '', notFound: false });
        try {
          const response = await apiClient.get(
            apiConfig.endpoints.studentFinalGrade(user.id),
          );
          const grade = response.data;
          setStudentGrade(grade);
          setStudentStatus({ loading: false, error: '', notFound: false });

          // Fetch deliverable names + grade breakdown for the student's group
          if (grade?.groupId) {
            const [histRes, delRes] = await Promise.allSettled([
              apiClient.get(
                apiConfig.endpoints.groupGradeHistory(grade.groupId),
                { params: { page: 1, limit: 1 } },
              ),
              apiClient.get('/deliverables', { params: { limit: 100 } }),
            ]);
            if (histRes.status === 'fulfilled') {
              const entries = histRes.value.data?.data ?? [];
              setStudentBreakdown(entries[0] ?? null);
            }
            if (delRes.status === 'fulfilled') {
              const dels = delRes.value.data?.data ?? delRes.value.data ?? [];
              const map = {};
              (Array.isArray(dels) ? dels : []).forEach((d) => {
                map[d.deliverableId] = d.name ?? d.deliverableId;
              });
              setDeliverableNameMap(map);
            }
          }
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
    setStudentEmailMap({});
    // Eagerly load deliverable names for the breakdown table
    if (Object.keys(deliverableNameMap).length === 0) {
      apiClient.get('/deliverables', { params: { limit: 100 } }).then((r) => {
        const dels = r.data?.data ?? r.data ?? [];
        const map = {};
        (Array.isArray(dels) ? dels : []).forEach((d) => {
          map[d.deliverableId] = d.name ?? d.deliverableId;
        });
        setDeliverableNameMap(map);
      }).catch(() => {});
    }
    setGroupStatus({ loading: true, error: '', notFound: false });
    setHistoryStatus({ loading: false, error: '', notFound: false });

    const gId = groupIdInput.trim();

    try {
      const [gradeResponse, groupResponse] = await Promise.allSettled([
        apiClient.get(apiConfig.endpoints.groupFinalGrade(gId)),
        apiClient.get(apiConfig.endpoints.groupById(gId)),
      ]);

      if (gradeResponse.status === 'rejected') throw gradeResponse.reason;

      setGroupGrade(gradeResponse.value.data);
      setGroupStatus({ loading: false, error: '', notFound: false });

      if (groupResponse.status === 'fulfilled') {
        const members = groupResponse.value.data?.members ?? [];
        const map = members.reduce((acc, m) => {
          const id = String(m?._id ?? '');
          if (id && m?.email) acc[id] = m.email;
          return acc;
        }, {});
        setStudentEmailMap(map);
      }

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
  if (user.role === 'Student' || user.role === 'TeamLeader') {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.headerSection}>
          <h1 className={styles.title}>MY GRADE</h1>
          <p className={styles.description}>Your individual final grade and contribution breakdown.</p>
        </div>

        {studentStatus.loading && (
          <div className={styles.loading}>Loading your grade...</div>
        )}

        {studentStatus.error && (
          <div className={styles.errorBox}>{studentStatus.error}</div>
        )}

        {studentStatus.notFound && (
          <div className={styles.infoBox}>
            <p>No grade available yet. Grade calculation has not been triggered.</p>
          </div>
        )}

        {studentGrade && (
          <>
            {/* Big summary cards: My Grade + Team Grade side by side */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  padding: 20,
                }}
              >
                <div style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  My Final Grade
                </div>
                <div style={{ color: '#38bdf8', fontWeight: 800, fontSize: '2rem', marginTop: 4 }}>
                  {studentGrade.finalGrade?.toFixed(2)}
                </div>
                <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: 4 }}>
                  Calculated {new Date(studentGrade.calculatedAt).toLocaleString()}
                </div>
              </div>

              <div
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  padding: 20,
                }}
              >
                <div style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Team Grade
                </div>
                <div style={{ color: '#34d399', fontWeight: 800, fontSize: '2rem', marginTop: 4 }}>
                  {studentBreakdown?.teamGrade != null
                    ? studentBreakdown.teamGrade.toFixed(2)
                    : '—'}
                </div>
                <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: 4 }}>
                  Shared by all team members
                </div>
              </div>

              <div
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  padding: 20,
                }}
              >
                <div style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  My Story Point Ratio
                </div>
                <div style={{ color: '#7dd3fc', fontWeight: 800, fontSize: '2rem', marginTop: 4 }}>
                  {(studentGrade.individualAllowanceRatio * 100).toFixed(0)}%
                </div>
                <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: 4 }}>
                  Completed pts ÷ Target pts
                </div>
              </div>
            </div>

            <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '-16px', marginBottom: '24px' }}>
              Final Grade = Team Grade × Story Point Ratio.
              Story Point Ratio reflects your completed points vs the target across sprints.
            </p>

            {studentBreakdown?.gradeComponents?.scaledDeliverableGrades?.length > 0 && (
              <div>
                <h2 style={{ color: '#f8fafc', marginBottom: '12px', fontSize: '0.95rem', fontWeight: 700 }}>
                  Grade Breakdown
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '12px' }}>
                  Team Grade: <span style={{ color: '#38bdf8', fontWeight: 600 }}>{studentBreakdown.teamGrade?.toFixed(2)}</span>
                  {' · '}Formula: Raw × Sprint Scalar × Weight = Scaled
                </p>
                <div className={styles.tableWrapper}>
                  <table className={styles.customTable}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Deliverable</th>
                        <th>Raw</th>
                        <th>Sprint Scalar</th>
                        <th>Weight</th>
                        <th>Scaled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentBreakdown.gradeComponents.scaledDeliverableGrades.map((d) => (
                        <tr key={d.deliverableId}>
                          <td style={{ textAlign: 'left', color: '#94a3b8' }}>
                            {deliverableNameMap[d.deliverableId] ?? d.deliverableId.slice(-8)}
                          </td>
                          <td>{d.rawGrade}</td>
                          <td style={{ color: '#7dd3fc' }}>{(d.teamScalar * 100).toFixed(1)}%</td>
                          <td>{d.deliverablePercentage}%</td>
                          <td style={{ color: '#34d399', fontWeight: 600 }}>{d.scaledGrade?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
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

  const handleCalculateGrades = async (e) => {
    e.preventDefault();
    const gId = calcGroupInput.trim();
    if (!gId) return;
    setCalcStatus({ loading: true, error: '', result: null });
    try {
      const res = await apiClient.post(
        apiConfig.endpoints.groupCalculate(gId),
        { force: calcForce },
      );
      setCalcStatus({ loading: false, error: '', result: res.data });
    } catch (err) {
      const msg = err?.response?.data?.message;
      setCalcStatus({
        loading: false,
        error: Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to calculate grades.'),
        result: null,
      });
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.headerSection}>
        <h1 className={styles.title}>GRADE DISPLAY</h1>
        <p className={styles.description}>View final grades and history for a group.</p>
      </div>

      {/* Calculate Grades — Coordinator only */}
      {user.role === 'Coordinator' && (
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ color: '#f8fafc', marginBottom: '12px', fontSize: '1rem', fontWeight: 700 }}>Calculate Grades</h2>
          <form
            onSubmit={handleCalculateGrades}
            style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}
          >
            <div style={{ flex: 1, minWidth: '200px' }}>
              <EntitySearchSelect
                endpoint={apiConfig.endpoints.groups}
                buildParams={(q) => ({ name: q, page: 1, limit: 20 })}
                getItems={(res) => res.data}
                returnField="groupId"
                displayField="groupName"
                value={calcGroupInput}
                onChange={setCalcGroupInput}
                placeholder="Search group by name"
                required
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={calcForce}
                onChange={(ev) => setCalcForce(ev.target.checked)}
              />
              Force recalculate
            </label>
            <button
              type="submit"
              disabled={calcStatus.loading}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                background: '#22c55e',
                color: '#0f172a',
                fontWeight: 700,
                border: 'none',
                cursor: calcStatus.loading ? 'not-allowed' : 'pointer',
              }}
            >
              {calcStatus.loading ? 'Calculating…' : 'Calculate Grades'}
            </button>
          </form>

          {calcStatus.error && (
            <div className={styles.errorBox} style={{ marginTop: '12px' }}>{calcStatus.error}</div>
          )}

          {calcStatus.result && (
            <div className={styles.infoBox} style={{ marginTop: '12px' }}>
              <p style={{ color: '#22c55e', fontWeight: 600 }}>
                Grades calculated successfully.
                {calcStatus.result.teamGrade != null && (
                  <> Team grade: <strong>{calcStatus.result.teamGrade.toFixed(2)}</strong></>
                )}
              </p>
            </div>
          )}
        </section>
      )}

      {/* Group lookup form */}
      <form
        onSubmit={fetchGroupGrade}
        style={{ display: 'flex', gap: '10px', marginBottom: '24px', alignItems: 'flex-end' }}
      >
        <div style={{ flex: 1 }}>
          <EntitySearchSelect
            endpoint={apiConfig.endpoints.groups}
            buildParams={(q) => ({ name: q, page: 1, limit: 20 })}
            getItems={(res) => res.data}
            returnField="groupId"
            displayField="groupName"
            value={groupIdInput}
            onChange={setGroupIdInput}
            placeholder="Search group by name"
            required
          />
        </div>
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
                <th>Student</th>
                <th>Final Grade</th>
                <th>Allowance Ratio</th>
                <th>Calculated At</th>
              </tr>
            </thead>
            <tbody>
              {groupGrade.individualGrades.map((ig) => (
                <tr key={ig.studentId}>
                  <td>{studentEmailMap[ig.studentId] ?? ig.studentId}</td>
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
                            <td colSpan={4} style={{ padding: '0 0 12px 0' }}>
                              <div style={{ background: '#0f172a', borderRadius: '8px', padding: '12px', marginTop: '4px' }}>
                                <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                  Deliverable Breakdown
                                </p>
                                {entry.gradeComponents?.scaledDeliverableGrades?.length > 0 ? (
                                  <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                                    <thead>
                                      <tr style={{ borderBottom: '1px solid #1e293b' }}>
                                        <th style={{ textAlign: 'left', padding: '4px 8px', color: '#475569', fontWeight: 600 }}>Deliverable</th>
                                        <th style={{ textAlign: 'right', padding: '4px 8px', color: '#475569', fontWeight: 600 }}>Raw</th>
                                        <th style={{ textAlign: 'right', padding: '4px 8px', color: '#475569', fontWeight: 600 }}>Scalar</th>
                                        <th style={{ textAlign: 'right', padding: '4px 8px', color: '#475569', fontWeight: 600 }}>Weight</th>
                                        <th style={{ textAlign: 'right', padding: '4px 8px', color: '#475569', fontWeight: 600 }}>Scaled</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {entry.gradeComponents.scaledDeliverableGrades.map((d) => (
                                        <tr key={d.deliverableId} style={{ borderBottom: '1px solid #1e293b' }}>
                                          <td style={{ padding: '5px 8px', color: '#94a3b8', fontSize: '0.75rem' }}>
                                            {deliverableNameMap[d.deliverableId] ?? d.deliverableId.slice(-8)}
                                          </td>
                                          <td style={{ padding: '5px 8px', textAlign: 'right', color: '#cbd5e1' }}>{d.rawGrade}</td>
                                          <td style={{ padding: '5px 8px', textAlign: 'right', color: '#7dd3fc' }}>
                                            {(d.teamScalar * 100).toFixed(1)}%
                                          </td>
                                          <td style={{ padding: '5px 8px', textAlign: 'right', color: '#cbd5e1' }}>
                                            {d.deliverablePercentage}%
                                          </td>
                                          <td style={{ padding: '5px 8px', textAlign: 'right', color: '#34d399', fontWeight: 600 }}>
                                            {d.scaledGrade?.toFixed(2)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : (
                                  <p style={{ color: '#475569', fontSize: '0.8rem' }}>No deliverable breakdown available.</p>
                                )}
                                <p style={{ color: '#475569', fontSize: '0.75rem', marginTop: '8px' }}>
                                  Overall team scalar: <span style={{ color: '#7dd3fc' }}>{(entry.gradeComponents?.teamScalar * 100)?.toFixed(1)}%</span>
                                  {' · '}Formula: Raw × Scalar × Weight = Scaled
                                </p>
                              </div>
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
