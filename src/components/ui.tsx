import type { CSSProperties, ReactNode } from 'react'

export const font = {
  display: 'Barlow Condensed, sans-serif',
  mono: 'JetBrains Mono, monospace',
}

/** Smallest comfortable touch target (Apple recommends 44 pt); every button, chip and field is at least this tall. */
export const TAP = 44

export function Card({ children, style, className = '' }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  return (
    <div className={`rounded-xl p-4 md:p-5 ${className}`} style={{ background: '#111116', border: '1px solid #2a2a35', ...style }}>
      {children}
    </div>
  )
}

export function Heading({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-4">
      <h1 className="text-3xl md:text-4xl font-bold tracking-wide uppercase" style={{ fontFamily: font.display, color: '#f0f0f5' }}>
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

/** Text fields: 16px type (so phones do not zoom in) and a full-height touch target. */
export const inputStyle: CSSProperties = {
  background: '#0a0a0c',
  border: '1px solid #2a2a35',
  color: '#f0f0f5',
  borderRadius: 10,
  padding: '0 14px',
  minHeight: 48,
  width: '100%',
  fontSize: 16,
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
  wide,
}: {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: 'primary' | 'ghost'
  disabled?: boolean
  /** Full width on phones (the main action of a form or card). */
  wide?: boolean
}) {
  const primary = variant === 'primary'
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg font-semibold tracking-wide uppercase disabled:opacity-50 ${wide ? 'w-full sm:w-auto' : ''}`}
      style={{
        fontFamily: font.display,
        fontSize: 17,
        minHeight: 48,
        padding: '0 20px',
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

/** A pill-shaped toggle button for filters and pickers. */
export function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className="rounded-full font-semibold"
      style={{
        fontFamily: font.display,
        fontSize: 17,
        letterSpacing: '0.03em',
        minHeight: TAP,
        padding: '0 16px',
        background: active ? '#e63946' : '#111116',
        color: active ? '#fff' : '#c0c0cc',
        border: `1px solid ${active ? '#e63946' : '#2a2a35'}`,
      }}
    >
      {children}
    </button>
  )
}

/** A short message under a form or heading. */
export function Notice({ kind, children }: { kind: 'error' | 'success' | 'warn'; children: ReactNode }) {
  const c = { error: ['#3a1216', '#ff8a93'], success: ['#0a2e22', '#6ee7b7'], warn: ['#33260a', '#fcd34d'] }[kind]
  return (
    <div className="mb-3 text-sm rounded-lg px-3 py-2.5" role={kind === 'error' ? 'alert' : 'status'} style={{ background: c[0], color: c[1] }}>
      {children}
    </div>
  )
}

export const chartColors = { red: '#e63946', blue: '#3b82f6', green: '#10b981', amber: '#f59e0b', violet: '#a78bfa', grid: '#2a2a35', axis: '#888899' }

/** One colour per teammate in the comparison charts (colour-blind-friendly enough alongside labels and legends). */
export const personColors = ['#e63946', '#3b82f6', '#10b981', '#f59e0b', '#a78bfa', '#ec4899']

export const tooltipStyle = {
  contentStyle: { background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: 8, color: '#f0f0f5' },
  labelStyle: { color: '#c0c0cc' },
}
