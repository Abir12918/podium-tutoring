import {
  calculateEarnedAmount,
  calculateExpectedTutorExpense,
  calculateHourlyRate,
  calculateProfit,
  calculateTutorExpense,
  isRecordPaused,
} from '../services/tuitionService';

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const toSafeNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const hasUsableValue = (value) => value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value));

const getExpectedProfit = (record) => {
  if (hasUsableValue(record.expectedProfit)) {
    return toSafeNumber(record.expectedProfit);
  }

  const expectedTutorExpense = hasUsableValue(record.expectedTutorExpense)
    ? toSafeNumber(record.expectedTutorExpense)
    : calculateExpectedTutorExpense(record.expectedTutoringHours, record.tutorHourlyPay);
  const expectedProfit = calculateProfit(record.expectedAmount, expectedTutorExpense);

  return toSafeNumber(expectedProfit);
};

const getEarnedProfit = (record) => {
  if (hasUsableValue(record.earnedProfit)) {
    return toSafeNumber(record.earnedProfit);
  }

  const hourlyRate = hasUsableValue(record.hourlyRate)
    ? toSafeNumber(record.hourlyRate)
    : calculateHourlyRate(record.expectedAmount, record.expectedTutoringHours);
  const earnedAmount = hasUsableValue(record.earnedAmount)
    ? toSafeNumber(record.earnedAmount)
    : calculateEarnedAmount(record.completedTutoringHours, hourlyRate);
  const tutorExpense = hasUsableValue(record.tutorExpense)
    ? toSafeNumber(record.tutorExpense)
    : calculateTutorExpense(record.completedTutoringHours, record.tutorHourlyPay);
  const earnedProfit = calculateProfit(earnedAmount, tutorExpense);

  return toSafeNumber(earnedProfit);
};

const sumBy = (items, getValue) => (
  items.reduce((total, item) => total + toSafeNumber(getValue(item)), 0)
);

export const calculateMonthlyEarnings = ({ tuitionRecords = [], expenses = [] } = {}) => {
  const activeTuitionRecords = Array.isArray(tuitionRecords)
    ? tuitionRecords.filter((record) => !isRecordPaused(record))
    : [];
  const monthlyExpenses = Array.isArray(expenses) ? expenses : [];
  const centerRecords = activeTuitionRecords.filter((record) => record.studentType === 'center');
  const oneOnOneRecords = activeTuitionRecords.filter((record) => record.studentType === 'one-on-one');
  const centerExpectedRevenue = sumBy(centerRecords, (record) => record.expectedAmount);
  const centerActualRevenue = sumBy(centerRecords, (record) => record.paidAmount);
  const oneOnOneExpectedProfit = sumBy(oneOnOneRecords, getExpectedProfit);
  const oneOnOneActualProfit = sumBy(oneOnOneRecords, getEarnedProfit);
  const expensesTotal = sumBy(monthlyExpenses, (expense) => expense.amount);
  const totalEarnings = centerActualRevenue + oneOnOneActualProfit - expensesTotal;
  const projectedEarnings = centerExpectedRevenue + oneOnOneExpectedProfit - expensesTotal;

  return {
    centerExpectedRevenue,
    centerActualRevenue,
    oneOnOneExpectedProfit,
    oneOnOneActualProfit,
    expenses: expensesTotal,
    totalExpenses: expensesTotal,
    totalEarnings,
    projectedEarnings,
  };
};

export const calculateYearlyEarnings = (monthSummaries = []) => {
  const summaries = Array.isArray(monthSummaries) ? monthSummaries : [];
  const centerExpectedRevenue = sumBy(summaries, (summary) => summary.centerExpectedRevenue);
  const centerActualRevenue = sumBy(summaries, (summary) => summary.centerActualRevenue);
  const oneOnOneExpectedProfit = sumBy(summaries, (summary) => summary.oneOnOneExpectedProfit);
  const oneOnOneActualProfit = sumBy(summaries, (summary) => summary.oneOnOneActualProfit);
  const expensesTotal = sumBy(summaries, (summary) => (
    hasUsableValue(summary.expenses) ? summary.expenses : summary.totalExpenses
  ));
  const totalEarnings = centerActualRevenue + oneOnOneActualProfit - expensesTotal;
  const projectedEarnings = centerExpectedRevenue + oneOnOneExpectedProfit - expensesTotal;

  return {
    centerExpectedRevenue,
    centerActualRevenue,
    oneOnOneExpectedProfit,
    oneOnOneActualProfit,
    expenses: expensesTotal,
    totalExpenses: expensesTotal,
    totalEarnings,
    projectedEarnings,
  };
};

export const getMonthKeysForYear = (year) => {
  const normalizedYear = Number(year);

  if (!Number.isInteger(normalizedYear)) {
    return [];
  }

  return Array.from({ length: 12 }, (_, monthIndex) => `${normalizedYear}-${String(monthIndex + 1).padStart(2, '0')}`);
};

export const formatMonthLabel = (monthKey) => {
  if (typeof monthKey !== 'string') {
    return '';
  }

  const [year, month] = monthKey.split('-').map(Number);
  const monthLabel = MONTH_LABELS[month - 1];

  if (!Number.isInteger(year) || !monthLabel) {
    return monthKey;
  }

  return `${monthLabel} ${year}`;
};
