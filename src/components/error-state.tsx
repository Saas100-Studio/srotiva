import Link from "next/link";

export function ErrorState({
  message,
  requestId,
}: {
  message: string;
  requestId?: string;
}) {
  return (
    <section className="error-state" role="alert" aria-labelledby="error-state-heading">
      <h2 id="error-state-heading">We couldn&apos;t complete that request</h2>
      <p>{message}</p>
      {requestId ? <p className="request-id">Request ID: <code>{requestId}</code></p> : null}
      <Link href="/help/troubleshooting">Troubleshooting steps</Link>
    </section>
  );
}
