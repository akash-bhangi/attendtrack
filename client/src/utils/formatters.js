/**
 * Converts a 24-hour time string ("09:00", "13:30", "20:00") into a clean 12-hour format ("9:00 AM", "1:30 PM", "8:00 PM").
 */
export const formatTime12h = (timeStr) => {
  if (!timeStr) return '';
  const match = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return timeStr;

  let [_, h, m] = match;
  let hour = parseInt(h, 10);
  if (isNaN(hour)) return timeStr;

  const period = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${m} ${period}`;
};
