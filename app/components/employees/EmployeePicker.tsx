/* @ts-nocheck */
'use client';

type Props = {
  onSelect?: (id: string) => void;
  value?: string | null;
};

export default function EmployeePicker({ onSelect, value }: Props) {
  return (
    <div style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }}>
      <strong>EmployeePicker</strong> placeholder. Selected: {value ?? 'none'}
      <div style={{ marginTop: 8 }}>
        <button
          type="button"
          onClick={() => onSelect?.('demo-employee-id')}
          style={{ padding: '6px 10px' }}
        >
          Pick demo employee
        </button>
      </div>
    </div>
  );
}

