/**
 * Returns all weekend dates (Saturdays and Sundays) for a given year and month.
 * @param {number} year - The full year (e.g., 2026)
 * @param {number} month - The zero-indexed month (0 = January, 11 = December)
 * @returns {string[]} Array of formatted date strings YYYY-MM-DD representing the weekends
 */
export const getWeekendDatesForMonth = (year, month) => {
  const dates = [];
  const date = new Date(year, month, 1);
  
  while (date.getMonth() === month) {
    const day = date.getDay();
    if (day === 0 || day === 6) { // 0 is Sunday, 6 is Saturday
      // Format as YYYY-MM-DD natively to avoid timezone shift issues
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
    }
    date.setDate(date.getDate() + 1);
  }
  
  return dates;
};

/**
 * Checks if a given date string (YYYY-MM-DD) is strictly in the future.
 * @param {string} dateString - The date string to check (YYYY-MM-DD)
 * @returns {boolean} True if the date is after today
 */
export const isFutureDate = (dateString) => {
  // Parse YYYY-MM-DD properly in local time to avoid UTC shift
  const [y, m, d] = dateString.split('-').map(Number);
  const checkDate = new Date(y, m - 1, d);
  const today = new Date();
  
  // Reset time to start of day for accurate day-only comparison
  checkDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  return checkDate > today;
};
