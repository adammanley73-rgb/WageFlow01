import { ReactNode } from "react";

type PageTemplateProps = {
  children: ReactNode;
  // Keep these optional props to avoid breaking existing imports and calls.
  // They are intentionally unused here because pages own their own HeaderBanner.
  title?: string;
  currentSection?: string;
};

export default function PageTemplate({ children }: PageTemplateProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8F5F0] to-[#E8EEFA]">
      <div className="mx-auto max-w-6xl px-4 py-10">
        {children}
      </div>
    </div>
  );
}
