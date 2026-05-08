import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import styles from '../../pages/DashboardPage.module.css';
import storyPointsService from '../../utils/storyPointsService';
import EntitySearchSelect from '../EntitySearchSelect';
import apiClient from '../../utils/apiClient';
import apiConfig from '../../config/api';

const SOURCE_META = {
  COORDINATOR_OVERRIDE: { label: 'COORDINATOR_OVERRIDE', className: styles.sourceWarning },
  JIRA_GITHUB: { label: 'JIRA_GITHUB', className: styles.sourceSuccess },
  MANUAL: { label: 'MANUAL', className: styles.sourceNeutral },
};

const StoryPointsPanel = ({ canOverride }) => {
  const [groupId, setGroupId] = useState('');
  const [sprintId, setSprintId] = useState('');
  const [sprintOptions, setSprintOptions] = useState([]);
  const [studentEmailMap, setStudentEmailMap] = useState({});
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [overrideValues, setOverrideValues] = useState({});
  const debounceRef = useRef(null);

  const isReady = useMemo(
    () => groupId.trim().length > 0 && sprintId.trim().length > 0,
    [groupId, sprintId],
  );

  useEffect(() => {
    apiClient
      .get(apiConfig.endpoints.sprints, { params: { page: 1, limit: 100 } })
      .then((r) => setSprintOptions(r.data?.data ?? []))
      .catch(() => setSprintOptions([]));
  }, []);

  useEffect(() => {
    const normalizedGroupId = groupId.trim();
    if (!normalizedGroupId) {
      setStudentEmailMap({});
      return;
    }

    let isCancelled = false;
    apiClient
      .get(apiConfig.endpoints.groupById(normalizedGroupId))
      .then((response) => {
        if (isCancelled) return;
        const members = response.data?.members ?? [];
        const nextMap = members.reduce((acc, member) => {
          const memberId = String(member?._id ?? '');
          if (memberId && member?.email) {
            acc[memberId] = member.email;
          }
          return acc;
        }, {});
        setStudentEmailMap(nextMap);
      })
      .catch(() => {
        if (!isCancelled) {
          setStudentEmailMap({});
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [groupId]);

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    [],
  );

  const syncRecords = (nextRecords) => {
    const sorted = [...nextRecords].sort((a, b) => {
      if (a.source === 'COORDINATOR_OVERRIDE' && b.source !== 'COORDINATOR_OVERRIDE') {
        return -1;
      }
      if (a.source !== 'COORDINATOR_OVERRIDE' && b.source === 'COORDINATOR_OVERRIDE') {
        return 1;
      }
      return a.studentId.localeCompare(b.studentId);
    });
    setRecords(sorted);
  };

  const loadRecords = async () => {
    if (!isReady) {
      toast.error('Önce groupId ve sprintId girin.');
      return;
    }
    setIsLoading(true);
    try {
      const summary = await storyPointsService.getStoryPoints(groupId.trim(), sprintId.trim());
      syncRecords(summary.records || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetch = async () => {
    if (!isReady) {
      toast.error('Önce groupId ve sprintId seçin.');
      return;
    }
    setIsFetching(true);
    try {
      const summary = await storyPointsService.fetchAndVerifyStoryPoints(
        groupId.trim(),
        sprintId.trim(),
      );
      syncRecords(summary.records || []);
      toast.success('Story point verileri yenilendi.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsFetching(false);
    }
  };

  const handleOverride = (studentId) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const inputValue = overrideValues[studentId];
    const nextTargetPoints = Number(inputValue);
    if (!Number.isFinite(nextTargetPoints) || nextTargetPoints < 0) {
      toast.error('targetPoints 0 veya daha büyük olmalı.');
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const updated = await storyPointsService.overrideStoryPoints(
          groupId.trim(),
          sprintId.trim(),
          studentId,
          nextTargetPoints,
        );
        setRecords((prev) =>
          prev.map((record) => (record.studentId === studentId ? updated : record)),
        );
        toast.success('Student target point güncellendi.');
      } catch (error) {
        toast.error(error.message);
      }
    }, 400);
  };

  return (
    <div className={styles.tableWrapper}>
      <h3 style={{ color: '#94a3b8', marginBottom: '12px' }}>Sprint Story Points</h3>
      <div className={styles.storyPointControls}>
        <EntitySearchSelect
          endpoint={apiConfig.endpoints.groups}
          buildParams={(q) => ({ name: q, page: 1, limit: 20 })}
          getItems={(res) => res.data}
          returnField="groupId"
          displayField="groupName"
          value={groupId}
          onChange={setGroupId}
          placeholder="Search group by name"
        />
        <select
          className={styles.storyPointInput}
          value={sprintId}
          onChange={(event) => setSprintId(event.target.value)}
        >
          <option value="">Select sprint…</option>
          {sprintOptions.map((s) => (
            <option key={s.sprintId} value={s.sprintId}>
              {s.sprintId} ({s.targetStoryPoints} pts)
            </option>
          ))}
        </select>
        <button className={styles.smallButton} onClick={loadRecords} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Load'}
        </button>
        <button className={styles.actionButton} onClick={handleFetch} disabled={isFetching || !isReady}>
          {isFetching ? 'Fetching...' : 'Fetch JIRA/GitHub'}
        </button>
      </div>

      <table className={styles.customTable}>
        <thead>
          <tr>
            <th>Student</th>
            <th>Completed</th>
            <th>Target</th>
            <th>Source</th>
            {canOverride && <th>Override</th>}
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const sourceMeta = SOURCE_META[record.source] || SOURCE_META.MANUAL;
            const studentLabel = studentEmailMap[record.studentId] || record.studentId;
            return (
              <tr key={record.studentId}>
                <td>{studentLabel}</td>
                <td>{record.completedPoints}</td>
                <td>{record.targetPoints}</td>
                <td>
                  <span className={`${styles.sourceBadge} ${sourceMeta.className}`}>
                    {sourceMeta.label}
                  </span>
                </td>
                {canOverride && (
                  <td>
                    <form
                      className={styles.overrideInlineForm}
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleOverride(record.studentId);
                      }}
                    >
                      <input
                        type="number"
                        min="0"
                        aria-label={`override-${record.studentId}`}
                        className={styles.storyPointNumberInput}
                        value={overrideValues[record.studentId] ?? record.targetPoints}
                        onChange={(event) =>
                          setOverrideValues((prev) => ({
                            ...prev,
                            [record.studentId]: event.target.value,
                          }))
                        }
                      />
                      <button type="submit" className={styles.smallButton}>
                        Apply
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            );
          })}
          {records.length === 0 && (
            <tr>
              <td colSpan={canOverride ? 5 : 4}>No story point records.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default StoryPointsPanel;
