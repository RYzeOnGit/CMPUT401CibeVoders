/** Date utility functions with Edmonton timezone support */
import { format, parseISO, isToday, isYesterday, isThisWeek } from 'date-fns';

const EDMONTON_TIMEZONE = 'America/Edmonton';

// Convert UTC date string to Edmonton timezone
const toEdmontonTime = (dateString: string): Date => {
  const date = parseISO(dateString);
  // Use Intl to get the date in Edmonton timezone
  const edmontonDateString = new Intl.DateTimeFormat('en-US', {
    timeZone: EDMONTON_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
  
  return new Date(edmontonDateString);
};

export const formatDate = (dateString: string): string => {
  const utcDate = parseISO(dateString);
  const edmontonDate = toEdmontonTime(dateString);
  
  // For relative dates (today, yesterday), we need to check against Edmonton time
  const now = new Date();
  const edmontonNow = new Date(now.toLocaleString('en-US', { timeZone: EDMONTON_TIMEZONE }));
  
  const isEdmontonToday = edmontonDate.toDateString() === edmontonNow.toDateString();
  const edmontonYesterday = new Date(edmontonNow);
  edmontonYesterday.setDate(edmontonYesterday.getDate() - 1);
  const isEdmontonYesterday = edmontonDate.toDateString() === edmontonYesterday.toDateString();
  
  if (isEdmontonToday) {
    return 'Today';
  }
  
  if (isEdmontonYesterday) {
    return 'Yesterday';
  }
  
  // Check if within this week
  const weekStart = new Date(edmontonNow);
  weekStart.setDate(edmontonNow.getDate() - edmontonNow.getDay());
  weekStart.setHours(0, 0, 0, 0);
  
  if (edmontonDate >= weekStart && edmontonDate <= edmontonNow) {
    return format(edmontonDate, 'EEEE'); // Day name
  }
  
  return format(edmontonDate, 'MMM d, yyyy');
};

export const formatDateTime = (dateString: string): string => {
  const edmontonDate = toEdmontonTime(dateString);
  return format(edmontonDate, 'MMM d, yyyy h:mm a');
};

// Get current time in Edmonton timezone formatted for datetime-local input
export const getCurrentEdmontonDateTime = (): string => {
  const now = new Date();
  const edmontonTime = now.toLocaleString('en-CA', {
    timeZone: EDMONTON_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  // Convert from "YYYY-MM-DD, HH:MM:SS" to "YYYY-MM-DDTHH:MM"
  const [datePart, timePart] = edmontonTime.split(', ');
  const timeWithoutSeconds = timePart.slice(0, 5);
  return `${datePart}T${timeWithoutSeconds}`;
};

// Convert datetime-local input to ISO string (considering it's in Edmonton time)
export const edmontonDateTimeToISO = (dateTimeLocal: string): string => {
  // dateTimeLocal is in format "YYYY-MM-DDTHH:MM"
  // We need to treat this as Edmonton time and convert to UTC
  const [datePart, timePart] = dateTimeLocal.split('T');
  const dateTimeString = `${datePart} ${timePart}:00`;
  
  // Create a date treating the input as Edmonton time
  const edmontonDate = new Date(dateTimeString + ' GMT-0700'); // MST (standard time)
  // Note: This is a simplification. For proper DST handling, we'd need a timezone library
  
  // More accurate approach using Intl
  const date = new Date(dateTimeLocal);
  const edmontonOffset = new Date(date.toLocaleString('en-US', { timeZone: EDMONTON_TIMEZONE }));
  const localOffset = new Date(date.toLocaleString('en-US'));
  const diff = localOffset.getTime() - edmontonOffset.getTime();
  
  return new Date(date.getTime() - diff).toISOString();
};

