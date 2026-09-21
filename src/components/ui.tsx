import type { CSSProperties, ReactNode } from 'react'

export const font = {
  display: 'Barlow Condensed, sans-serif',
  mono: 'JetBrains Mono, monospace',
}

export function Card({ children, style, className = '' }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  return (
    <div
      className={`rounded-xl p-4 md:p-5 ${className}`}
      style={{ background: '#111116', border: '1px solid #2a2a35', ...style }}
    >
      {children}
    </div>
  )
}

export function Heading({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-4">
      <h1
        className="text-3xl md:text-4xl font-bold tracking-wide uppercase"
        style={{ fontFamily: font.display, color: '#f0f0f5' }}
      >
        {children}
      </h1>
      {sub && (
        <div className="text-sm mt-1" style={{ color: '#888899' }}>
          {sub}
        </div>
      )}
    </div>
  )
}

export function Stat({ label, value, unit, color = '#f0f0f5' }: { label: string; value: ReactNode; unit?: string; color?: string }) {
  return (
    <Card>
      <div className="text-xs uppercase tracking-widest" style={{ color: '#888899', fontFamily: font.display }}>
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-3xl font-bold" style={{ fontFamily: font.display, color }}>
          {value}
        </span>
        {unit && (
          <span className="text-sm" style={{ color: '#888899' }}>
            {unit}
          </span>
        )}
      </div>
    </Card>
  )
}

export const inputStyle: CSSProperties = {
  background: '#0a0a0c',
  border: '1px solid #2a2a35',
  color: '#f0f0f5',
  borderRadius: 8,
  padding: '10px 12px',
  width: '100%',
  fontSize: 15,
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-widest mb-1" style={{ color: '#888899', fontFamily: font.display }}>
        {label}
      </span>
      {children}
    </label>
  )
}

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: 'primary' | 'ghost'
  disabled?: boolean
}) {
  const primary = variant === 'primary'
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg px-4 py-2.5 font-semibold tracking-wide uppercase disabled:opacity-50"
      style={{
        fontFamily: font.display,
        fontSize: 16,
        background: primary ? '#e63946' : 'transparent',
        color: primary ? '#fff' : '#c0c0cc',
        border: primary ? '1px solid #e63946' : '1px solid #2a2a35',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  )
}

export const chartColors = { red: '#e63946', blue: '#3b82f6', green: '#10b981', amber: '#f59e0b', grid: '#2a2a35', axis: '#888899' }

export const tooltipStyle = {
  contentStyle: { background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: 8, color: '#f0f0f5' },
  labelStyle: { color: '#c0c0cc' },
}
