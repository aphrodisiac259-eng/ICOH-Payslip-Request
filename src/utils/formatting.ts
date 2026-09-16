/**
 * ICOH Portal - Formatting & Display Utilities
 */

export const MONTHS = [
  { value: 1, name: 'January' },
  { value: 2, name: 'February' },
  { value: 3, name: 'March' },
  { value: 4, name: 'April' },
  { value: 5, name: 'May' },
  { value: 6, name: 'June' },
  { value: 7, name: 'July' },
  { value: 8, name: 'August' },
  { value: 9, name: 'September' },
  { value: 10, name: 'October' },
  { value: 11, name: 'November' },
  { value: 12, name: 'December' },
];

export function getMonthName(monthNumber: number): string {
  const match = MONTHS.find((m) => m.value === monthNumber);
  return match ? match.name : `Month ${monthNumber}`;
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatDate(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatShortDate(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return isoString;
  }
}

export function generateRequestId(year: number = new Date().getFullYear()): string {
  const randomDigits = Math.floor(100000 + Math.random() * 900000);
  return `ICOH-PS-${year}-${randomDigits}`;
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Ready':
    case 'Completed':
      return 'bg-emerald-100 text-emerald-800 border border-emerald-300';
    case 'Processing':
      return 'bg-amber-100 text-amber-800 border border-amber-300';
    case 'Pending':
      return 'bg-blue-100 text-blue-800 border border-blue-300';
    case 'Rejected':
      return 'bg-rose-100 text-rose-800 border border-rose-300';
    case 'Cancelled':
      return 'bg-zinc-100 text-zinc-700 border border-zinc-300';
    default:
      return 'bg-zinc-100 text-zinc-800 border border-zinc-200';
  }
}
