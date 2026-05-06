const MS_PER_DAY = 1000 * 60 * 60 * 24;

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

const isValidDate = (date) => date instanceof Date && !Number.isNaN(date.getTime());

const startOfDay = (date) => {
  const parsedDate = parseDate(date);

  if (!isValidDate(parsedDate)) {
    throw new Error('Invalid date provided.');
  }

  parsedDate.setHours(0, 0, 0, 0);
  return parsedDate;
};

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getWeekStart = (date, month) => {
  const weekStart = new Date(date);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  if (weekStart.getMonth() !== month) {
    return new Date(date.getFullYear(), month, 1);
  }

  return weekStart;
};

const getWeekEnd = (date, month) => {
  const weekEnd = new Date(date);
  weekEnd.setDate(weekEnd.getDate() + (6 - weekEnd.getDay()));

  if (weekEnd.getMonth() !== month) {
    return new Date(date.getFullYear(), month + 1, 0);
  }

  return weekEnd;
};

export const getMonthKeyFromDate = (date) => {
  const parsedDate = parseDate(date);

  if (!isValidDate(parsedDate)) {
    throw new Error('Invalid date provided for monthKey generation.');
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');

  return `${year}-${month}`;
};

export const getCurrentMonthKey = () => getMonthKeyFromDate(new Date());

export const getWeeksForMonth = (year, month) => {
  const normalizedYear = Number(year);
  const normalizedMonth = Number(month);

  if (!Number.isInteger(normalizedYear) || !Number.isInteger(normalizedMonth) || normalizedMonth < 0 || normalizedMonth > 11) {
    throw new Error('year must be an integer and month must be a zero-indexed month from 0 to 11.');
  }

  const weeks = [];
  let cursor = new Date(normalizedYear, normalizedMonth, 1);

  while (cursor.getMonth() === normalizedMonth) {
    const weekStart = getWeekStart(cursor, normalizedMonth);
    const weekEnd = getWeekEnd(cursor, normalizedMonth);

    weeks.push({
      weekNumber: weeks.length + 1,
      startDate: formatDateKey(weekStart),
      endDate: formatDateKey(weekEnd),
      tasks: [],
    });

    cursor = new Date(weekEnd);
    cursor.setDate(cursor.getDate() + 1);
  }

  return weeks;
};

export const groupTasksByWeek = (tasks = [], year, month) => {
  const weeks = getWeeksForMonth(year, month);

  tasks.forEach((task) => {
    if (!task.dueDate) {
      return;
    }

    const dueDate = startOfDay(task.dueDate);
    const dueDateKey = formatDateKey(dueDate);
    const matchingWeek = weeks.find((week) => dueDateKey >= week.startDate && dueDateKey <= week.endDate);

    if (matchingWeek) {
      matchingWeek.tasks.push(task);
    }
  });

  return weeks;
};

export const getTaskReminderState = (task) => {
  if (task?.status === 'Done') {
    return 'done';
  }

  const dueDate = startOfDay(task?.dueDate);
  const today = startOfDay(new Date());
  const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / MS_PER_DAY);

  if (daysUntilDue < 0) {
    return 'overdue';
  }

  if (daysUntilDue === 0) {
    return 'dueToday';
  }

  if (daysUntilDue <= 7) {
    return 'dueThisWeek';
  }

  return 'upcoming';
};

export const calculateTaskSummary = (tasks = []) => {
  const currentMonthKey = getCurrentMonthKey();

  return tasks.reduce(
    (summary, task) => {
      const reminderState = getTaskReminderState(task);

      if (reminderState === 'overdue') {
        summary.overdue += 1;
      }

      if (reminderState === 'dueToday') {
        summary.dueToday += 1;
      }

      if (reminderState === 'dueThisWeek') {
        summary.dueThisWeek += 1;
      }

      if (task.status === 'In Progress') {
        summary.inProgress += 1;
      }

      if (task.status === 'Done' && task.monthKey === currentMonthKey) {
        summary.doneThisMonth += 1;
      }

      return summary;
    },
    {
      overdue: 0,
      dueToday: 0,
      dueThisWeek: 0,
      inProgress: 0,
      doneThisMonth: 0,
    }
  );
};
