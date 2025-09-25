// preview-safe middleware; bypass auth in preview
// TODO(prod): remove preview bypass before release.

import { NextResponse } from "next/server"

export function middleware(req: Request) {
  if (
    process.env.BUILD_PROFILE === "preview" ||
    process.env.NEXT_PUBLIC_APP_ENV === "preview"
  ) {
    return NextResponse.next()
  }

  // Non-preview: keep normal behavior
  return NextResponse.next()
}

// Apply to everything except Next internals and obvious assets
export const config = {
  matcher: ["/((?!_next|favicon.ico|assets|.*\\.(?:png|jpg|jpeg|gif|svg|ico)).*)"]
}
