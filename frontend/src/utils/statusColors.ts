/** Status color utilities */
import type { ApplicationStatus } from '../types';

export const statusColors: Record<ApplicationStatus, string> = {
  Applied: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  Interview: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  Offer: 'bg-green-500/20 text-green-300 border border-green-500/30',
  Rejected: 'bg-red-500/20 text-red-300 border border-red-500/30',
};

export const getStatusColor = (status: ApplicationStatus): string => {
  return statusColors[status] || 'bg-gray-100 text-gray-800';
};

