'use client';

import React, { type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';

/**
 * Shared tokens consistent with the final Payroll page.
 * Body uses system font. Inter is applied only to numeric values via the .wf-num class.
 */
const TOKENS = {
  gradientBg:
    'linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)',
  deepBlue: '#1e40af',
  deepBlueTint: 'rgba(30,64,175,0.08)',
  cardBg: 'rgba(255,255,255,0.85)',
  radiusLg: '1rem',
};

const LAYOUT: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: TOKENS.gradientBg,
    padding: '32px 16px',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    color: '#0b1220',
  },
  wrap: {
    maxWidth: '1100px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    justifyContent: 'space-between',
    background: TOKENS.cardBg,
    borderRadius: TOKENS.radiusLg,
    padding: '16px 20px',
  },
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: 0,
  },
  title: {
    fontSize: '24px',
    lineHeight: 1.2,
    fontWeight: 800,
    color: '#0b1220',
  },
  subtitle: {
    fontSize: '14px',
    lineHeight: 1.4,
    color: 'rgba(0,0,0,0.65)',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  card: {
    background: TOKENS.cardBg,
    borderRadius: TOKENS.radiusLg,
    padding: '16px',
  },
};

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'ghost';
  href?: never;
  disabled?: boolean;
  title?: string;
};

type LinkButtonProps = {
  children: ReactNode;
  href: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  title?: string;
};

function classForVariant(variant: ButtonProps['variant']) {
  switch (variant) {
    case 'secondary':
      return {
        background: 'rgba(0,0,0,0.04)',
        color: '#0b1220',
        border: '1px solid rgba(0,0,0,0.08)',
      } as CSSProperties;
    case 'ghost':
      return {
        background: 'transparent',
        color: TOKENS.deepBlue,
        border: '1px solid transparent',
      } as CSSProperties;
    case 'primary':
    default:
      return {
        background: TOKENS.deepBlue,
        color: '#fff',
        border: '1px solid ' + TOKENS.deepBlue,
      } as CSSProperties;
  }
}

/**
 * Button
 */
export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled,
  title,
}: ButtonProps) {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: '999px',
    fontWeight: 700,
    fontSize: '14px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    textDecoration: 'none',
    userSelect: 'none',
    transition: 'transform 120ms ease',
  };
  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      title={title}
      style={{ ...base, ...classForVariant(variant) }}
    >
      {children}
    </button>
  );
}

/**
 * LinkButton
 */
export function LinkButton({
  children,
  href,
  variant = 'primary',
  title,
}: LinkButtonProps) {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: '999px',
    fontWeight: 700,
    fontSize: '14px',
    textDecoration: 'none',
    userSelect: 'none',
  };
  return (
    <Link href={href} title={title} style={{ ...base, ...classForVariant(variant) }}>
      {children}
    </Link>
  );
}

/**
 * PageShell: gradient background + centered content
 */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div style={LAYOUT.page}>
      <div style={LAYOUT.wrap}>{children}</div>
      <style>
        {`
          /* Inter for numeric values only */
          @font-face {
            font-family: 'InterVar';
            src: local('Inter');
            font-display: swap;
          }
          .wf-num, .wf-num * {
            font-family: InterVar, Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji','Segoe UI Emoji', 'Segoe UI Symbol' !important;
            font-variant-numeric: tabular-nums;
          }
          @media (max-width: 640px) {
            .wf-header-title { font-size: 20px !important; }
          }
        `}
      </style>
    </div>
  );
}

/**
 * Header: title, subtitle, actions right-aligned
 */
export function Header({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div style={LAYOUT.header}>
      <div style={LAYOUT.titleBlock}>
        <div className="wf-header-title" style={LAYOUT.title}>
          {title}
        </div>
        {subtitle ? <div style={LAYOUT.subtitle}>{subtitle}</div> : null}
      </div>
      <div style={LAYOUT.actions}>{actions}</div>
    </div>
  );
}

/**
 * CardStat: numeric highlight with Inter applied to the value only
 */
export function CardStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  const card = LAYOUT.card;
  const labelStyle: CSSProperties = {
    fontSize: '13px',
    color: 'rgba(0,0,0,0.65)',
    marginBottom: '8px',
  };
  const valueStyle: CSSProperties = {
    fontSize: '24px',
    fontWeight: 800,
  };
  const hintStyle: CSSProperties = {
    fontSize: '12px',
    color: 'rgba(0,0,0,0.6)',
    marginTop: '6px',
  };

  return (
    <div style={{ ...card }}>
      <div style={labelStyle}>{label}</div>
      <div className="wf-num" style={valueStyle}>
        {value}
      </div>
      {hint ? <div style={hintStyle}>{hint}</div> : null}
    </div>
  );
}
