export function notificationReadKey(userId: string): string {
  return `medcore_notifications_read:${userId}`;
}
export function parseReadIds(value: string | null): string[] {
  try {
    const result: unknown = JSON.parse(value || '[]');
    return Array.isArray(result) ? result.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}
