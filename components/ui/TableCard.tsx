'use client';

import React from 'react';

export type Column<T> = {
  key: string;
  header: string;
  className?: string;
  stickyLeft?: boolean;
  render?: (row: T) => React.ReactNode;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey?: (row: T, index: number) => string;
  footerRightText?: string;
  tableClassName?: string;
};

export default function TableCard<T>({
  columns,
  rows,
  rowKey,
  footerRightText,
  tableClassName,
}: Props<T>) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className={`min-w-full border-separate border-spacing-0 ${tableClassName ?? ''}`}>
          <thead>
            <tr className="bg-neutral-50 text-left text-sm">
              {columns.map((c, i) => (
                <th
                  key={c.key}
                  className={[
                    'border-b border-neutral-200 px-4 py-3 font-medium',
                    i === 0 ? 'sticky left-0 z-[1] bg-neutral-50 rounded-tl-xl' : '',
                    i === columns.length - 1 ? 'rounded-tr-xl' : '',
                    c.className ?? '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&>tr+tr>td]:border-t-2 [&>tr+tr>td]:border-neutral-300">
            {rows.map((row, idx) => {
              const id = rowKey?.(row, idx) ?? String(idx);
              return (
                <tr key={id} className="text-sm even:bg-neutral-50">
                  {columns.map((c, i) => (
                    <td
                      key={c.key}
                      className={[
                        'px-4 py-3',
                        c.stickyLeft ? 'sticky left-0 z-[1] bg-inherit' : '',
                        c.className ?? '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {c.render ? c.render(row) : (row as any)[c.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-neutral-200 p-3 text-right text-xs text-neutral-500">
        {footerRightText}
      </div>
    </div>
  );
}
