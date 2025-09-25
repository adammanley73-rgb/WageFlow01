// middleware.ts - preview-safe
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export function middleware(req: NextRequest) {
  // Public preview: skip all auth if profile is preview
  if (process.env.BUILD_PROFILE === "preview" || process.env.NEXT_PUBLIC_APP_ENV === "preview") {
    return NextResponse.next()
  }

  // If you have real auth, keep it for non-preview here.
  return NextResponse.next()
}

export const config = {
  matcher: [
    // keep your existing routes or make it global
    "/((?!_next|favicon.ico|api/ping).*)"
  ]
}
