export default function NotFound() {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{
        minHeight: '100vh',
        color: 'var(--foreground, #0f172a)',
        backgroundColor: 'var(--background, #ffffff)',
      }}
    >
      <h1
        style={{
          fontSize: 'var(--font-size-4xl, 2.25rem)',
          fontWeight: 'var(--font-weight-bold, 700)',
          color: 'var(--foreground, #0f172a)',
          marginBottom: 'var(--spacing-2, 0.5rem)',
        }}
      >
        404
      </h1>
      <p
        style={{
          fontSize: 'var(--font-size-base, 1rem)',
          color: 'var(--muted-foreground, #64748b)',
        }}
      >
        Page not found
      </p>
    </div>
  );
}