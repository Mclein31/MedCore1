/**
 * Currency, time, and privacy mask formatters for Philippine healthcare operations.
 */

export function formatPeso(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount).replace('PHP', '₱');
}

export function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
}

export function maskName(fullName: string): string {
  const parts = fullName.split(' ');
  if (parts.length <= 1) return fullName;
  const lastName = parts[0];
  const firstInitial = parts[1]?.charAt(0) || '';
  return `${lastName}, ${firstInitial}***`;
}

export function formatPstTimestamp(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }) + ' PST';
  } catch {
    return dateStr;
  }
}
