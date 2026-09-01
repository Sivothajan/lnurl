export function getCurrentWeekTimestamp() {
  const now = new Date();
  const day = now.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);

  return String(Math.floor(monday.getTime() / 1000));
}

export function getTime() {
  return new Date().toISOString();
}
