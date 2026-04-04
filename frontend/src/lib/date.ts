/**
 * Centralized date formatting for Masareef.
 * All dates display as dd/mm/yyyy per project convention.
 */

/** Format a date string or Date object as dd/mm/yyyy */
export function formatDate(value: string | Date): string {
  let dd: string, mm: string, yyyy: number;

  // Parse date-only strings (YYYY-MM-DD) via string split to avoid
  // UTC interpretation that can shift the calendar day in negative timezones.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    yyyy = Number(y);
    mm = m;
    dd = d;
  } else {
    const d = typeof value === "string" ? new Date(value) : value;
    if (isNaN(d.getTime())) return String(value);
    dd = String(d.getDate()).padStart(2, "0");
    mm = String(d.getMonth() + 1).padStart(2, "0");
    yyyy = d.getFullYear();
  }
  return `${dd}/${mm}/${yyyy}`;
}

/** Format a date as a relative label: "today", "yesterday", "3 days ago", or dd/mm/yyyy for 30+ days */
export function formatRelativeDate(
  value: string | Date,
  labels: {
    today: string;
    yesterday: string;
    daysAgo: string;
    noActivity: string;
  }
): string {
  if (!value) return labels.noActivity;
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return labels.noActivity;

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return labels.today;
  if (diffDays === 1) return labels.yesterday;
  if (diffDays < 30) return labels.daysAgo.replace("{days}", String(diffDays));
  return formatDate(d);
}
