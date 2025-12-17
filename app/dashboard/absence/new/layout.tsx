/* C:\Users\adamm\Projects\wageflow01\app\dashboard\absence\new\layout.tsx */
import { ReactNode } from "react";

export default function AbsenceNewLayout({ children }: { children: ReactNode }) {
return (
<div className="flex-1 min-h-0">
<div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
{children}
</div>
</div>
);
}