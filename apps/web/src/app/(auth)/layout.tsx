// Route group layout for /login and /register.
// Keeps auth pages visually consistent.
// Route protection (redirect if already logged in) is handled by middleware.ts.

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
