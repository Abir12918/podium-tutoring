const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

const parseDate = (date) => {
  if (date instanceof Date) {
    return new Date(date);
  }

  if (typeof date === 'string') {
    const dateOnlyMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
  }

  return new Date(date);
};

const parseDeadlineDate = (date) => {
  const parsedDate = parseDate(date);

  // Goal end dates are usually stored as YYYY-MM-DD. Treat those as end-of-day
  // deadlines so a goal due today is not overdue immediately after midnight.
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(parsedDate.getTime())) {
    parsedDate.setHours(23, 59, 59, 999);
  }

  return parsedDate;
};

const isValidDate = (date) => date instanceof Date && !Number.isNaN(date.getTime());

/**
 * Returns Q1, Q2, Q3, or Q4 for a date.
 * Month values are zero-indexed in JavaScript, so January is 0 and December is 11.
 */
export const getQuarterFromDate = (date) => {
  const parsedDate = parseDate(date);

  if (!isValidDate(parsedDate)) {
    throw new Error('Invalid date provided for quarter detection.');
  }

  const quarterIndex = Math.floor(parsedDate.getMonth() / 3);
  return QUARTERS[quarterIndex];
};

export const getCurrentQuarter = () => getQuarterFromDate(new Date());

/**
 * Calculates the calendar-aware time remaining until an end date.
 * Date-only strings are parsed in local time to avoid UTC shifting the deadline.
 */
export const getTimeRemaining = (endDate) => {
  const deadline = parseDeadlineDate(endDate);

  if (!isValidDate(deadline)) {
    throw new Error('Invalid endDate provided for time remaining calculation.');
  }

  const now = new Date();
  const isOverdue = deadline < now;
  const startDate = isOverdue ? deadline : now;
  const targetDate = isOverdue ? now : deadline;

  let cursor = new Date(startDate);
  let months = 0;

  while (true) {
    const nextMonth = new Date(cursor);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    if (nextMonth > targetDate) {
      break;
    }

    months += 1;
    cursor = nextMonth;
  }

  const remainingMs = targetDate.getTime() - cursor.getTime();
  const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  return {
    isOverdue,
    months,
    days,
    hours,
  };
};

export const calculateGoalSummary = (goals = []) => {
  const totalGoals = goals.length;
  const doneGoals = goals.filter((goal) => goal.status === 'Done').length;
  const inProgressGoals = goals.filter((goal) => goal.status === 'In Progress').length;
  const blockedGoals = goals.filter((goal) => goal.status === 'Blocked').length;
  const totalProgress = goals.reduce((sum, goal) => sum + (Number(goal.progress) || 0), 0);

  return {
    totalGoals,
    doneGoals,
    inProgressGoals,
    blockedGoals,
    averageProgress: totalGoals > 0 ? Math.round(totalProgress / totalGoals) : 0,
  };
};
