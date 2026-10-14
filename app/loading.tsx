export default function Loading() {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-transparent"
      role="status"
      aria-label="Loading page"
    >
      <div className="h-full w-1/3 animate-pulse bg-teal" />
    </div>
  );
}
