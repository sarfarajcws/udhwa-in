export default function Loading() {
  return (
    <div className="container-page animate-pulse py-8 sm:py-12" aria-busy="true" aria-label="Loading">
      <div className="h-9 w-40 rounded bg-sunken" />
      <div className="mt-5 h-12 max-w-2xl rounded-lg bg-sunken" />
      <div className="mt-8 max-w-3xl space-y-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-sunken" />)}
      </div>
    </div>
  );
}
