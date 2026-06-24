'use client';
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error;
  unstable_retry: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ padding: 32, fontFamily: 'system-ui' }}>
          <h2>Application error</h2>
          <p>{error.message}</p>
          <button onClick={unstable_retry}>Reload</button>
        </div>
      </body>
    </html>
  );
}
