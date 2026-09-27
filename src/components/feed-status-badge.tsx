export function FeedStatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-badge--${status.toLowerCase()}`}>{status.toLowerCase()}</span>;
}
