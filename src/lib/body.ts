import { bmi } from './health'
import type { BodyMetric } from './api'

export type BodyKind = 'weight' | 'bmi' | 'fat' | 'waist'

export const BODY_KINDS: { kind: BodyKind; label: string; unit: string }[] = [
  { kind: 'weight', label: 'Weight', unit: 'kg' },
  { kind: 'bmi', label: 'BMI', unit: '' },
  { kind: 'fat', label: 'Body fat', unit: '%' },
  { kind: 'waist', label: 'Waist', unit: 'cm' },
]

export interface BodyPoint {
  /** YYYY-MM-DD */
  date: string
  value: number
}

const round1 = (n: number) => Math.round(n * 10) / 10

/** One line of a chart: every weigh-in that has this measurement, oldest first. BMI needs the person's height. */
export function bodySeries(metrics: BodyMetric[], kind: BodyKind, heightCm: number | null): BodyPoint[] {
  const points: BodyPoint[] = []
  for (const m of [...metrics].sort((a, b) => (a.measured_on < b.measured_on ? -1 : a.measured_on > b.measured_on ? 1 : 0))) {
    let value: number | null = null
    if (kind === 'weight') value = m.weight_kg
    else if (kind === 'bmi') value = heightCm ? bmi(m.weight_kg, heightCm) : null
    else if (kind === 'fat') value = m.body_fat_pct
    else value = m.waist_cm
    if (value !== null && value !== undefined && Number.isFinite(value)) points.push({ date: m.measured_on, value: round1(value) })
  }
  return points
}

export interface BodySummary {
  first: BodyPoint
  latest: BodyPoint
  /** latest − first, rounded to one decimal. */
  change: number
  /** Lowest and highest value recorded. */
  min: number
  max: number
}

export function summarize(points: BodyPoint[]): BodySummary | null {
  if (points.length === 0) return null
  const values = points.map((p) => p.value)
  return {
    first: points[0],
    latest: points[points.length - 1],
    change: round1(points[points.length - 1].value - points[0].value),
    min: Math.min(...values),
    max: Math.max(...values),
  }
}
