'use client';
import React from 'react';

type Props = {
  title?: string;
  children?: React.ReactNode;
};

export default function HeaderBanner({ title = 'Header', children }: Props) {
  return (
    <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8, background: '#f9fafb', marginBottom: 12 }}>
      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{title}</h1>
      {children}
    </div>
  );
}
