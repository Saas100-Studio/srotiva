export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="loading-state" role="status" aria-live="polite" aria-busy="true">
      <span className="loading-state__indicator" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
