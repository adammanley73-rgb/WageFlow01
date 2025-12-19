// C:\Users\adamm\Projects\wageflow01\app\login\page.tsx
import { redirect } from "next/navigation"
import { Suspense } from "react"
import LoginForm from "./LoginForm"

function isVercelRuntime() {
  return process.env.VERCEL === "1" || process.env.VERCEL === "true"
}

const bypassEnabled =
  (process.env.AUTH_BYPASS === "1" || process.env.NEXT_PUBLIC_AUTH_BYPASS === "1") &&
  !isVercelRuntime()

function LoginFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center px-4">
      <div className="text-white text-sm opacity-90">Loading...</div>
    </div>
  )
}

export default function LoginPage() {
  if (bypassEnabled) {
    redirect("/dashboard")
  }

  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  )
}
