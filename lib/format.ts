export function formatISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function formatShortDate(d: Date): string {
  // YYYY-MM-DD
  return formatISODate(d);
}

