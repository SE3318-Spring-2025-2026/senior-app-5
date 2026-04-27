const WINDOW_STATE = {
  UPCOMING: 'Upcoming',
  OPEN: 'Open',
  CLOSED: 'Closed',
  UNAVAILABLE: 'Unavailable',
};

const parseUtcDate = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatLocalDateTime = (date) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);

export const getSubmissionWindowStatus = (submissionStart, submissionEnd, now = new Date()) => {
  const startDate = parseUtcDate(submissionStart);
  const endDate = parseUtcDate(submissionEnd);

  if (!startDate || !endDate) {
    return {
      state: WINDOW_STATE.UNAVAILABLE,
      isActive: false,
      message: 'Submission window is not configured for this phase yet.',
      startDate,
      endDate,
    };
  }

  const nowMs = now.getTime();
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();

  if (nowMs < startMs) {
    return {
      state: WINDOW_STATE.UPCOMING,
      isActive: false,
      message: `Submission window opens on ${formatLocalDateTime(startDate)}.`,
      startDate,
      endDate,
    };
  }

  if (nowMs >= endMs) {
    return {
      state: WINDOW_STATE.CLOSED,
      isActive: false,
      message: `Submission deadline passed on ${formatLocalDateTime(endDate)}.`,
      startDate,
      endDate,
    };
  }

  return {
    state: WINDOW_STATE.OPEN,
    isActive: true,
    message: `Submission window is open until ${formatLocalDateTime(endDate)}.`,
    startDate,
    endDate,
  };
};

export { WINDOW_STATE };