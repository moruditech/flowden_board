const UNITS = [
  { label: 'year',   ms: 31_536_000_000 },
  { label: 'month',  ms:  2_592_000_000 },
  { label: 'week',   ms:    604_800_000 },
  { label: 'day',    ms:     86_400_000 },
  { label: 'hour',   ms:      3_600_000 },
  { label: 'minute', ms:         60_000 },
];

export function formatRelative(date) {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60_000) return 'just now';
  for (const { label, ms } of UNITS) {
    const n = Math.floor(diff / ms);
    if (n >= 1) return `${n} ${label}${n > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

export function formatDate(date, opts = {}) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', ...opts,
  });
}

export function formatDateTime(date) {
  return new Date(date).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
