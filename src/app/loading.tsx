export default function Loading() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <span className="route-loading-bar" aria-hidden="true" />
      <div className="route-loading-mark">
        <span aria-hidden="true">PADMA</span>
        <small aria-hidden="true">ETHNIC WEAR</small>
      </div>
      <span className="sr-only">Loading the next page</span>
    </div>
  );
}
