import { describe, expect, it } from 'vitest'
import { bodySeries, summarize } from './body'
import type { BodyMetric } from './api'

const m = (measured_on: string, weight_kg: number, body_fat_pct: number | null = null, waist_cm: number | null = null): BodyMetric => ({
  id: 1, user_id: 1, measured_on, weight_kg, body_fat_pct, waist_cm,
})

const data = [m('2026-09-10', 82, 18, 90), m('2026-09-03', 84, null, 92), m('2026-09-17', 80.5, 16.5, null)]

describe('bodySeries', () => {
  it('is sorted oldest first whatever order the entries arrive in', () => {
    expect(bodySeries(data, 'weight', 175).map((p) => p.date)).toEqual(['2026-09-03', '2026-09-10', '2026-09-17'])
  })
  it('weight uses every entry', () => {
    expect(bodySeries(data, 'weight', null).map((p) => p.value)).toEqual([84, 82, 80.5])
  })
  it('BMI is derived from weight and height, and needs a height', () => {
    expect(bodySeries(data, 'bmi', 175).map((p) => p.value)).toEqual([27.4, 26.8, 26.3])
    expect(bodySeries(data, 'bmi', null)).toEqual([])
  })
  it('body fat and waist only include entries that have them', () => {
    expect(bodySeries(data, 'fat', 175).map((p) => p.value)).toEqual([18, 16.5])
    expect(bodySeries(data, 'waist', 175).map((p) => p.value)).toEqual([92, 90])
  })
  it('is empty with no entries', () => {
    expect(bodySeries([], 'weight', 175)).toEqual([])
  })
})

describe('summarize', () => {
  it('reports first, latest, change and range', () => {
    const s = summarize(bodySeries(data, 'weight', 175))!
    expect(s.first).toEqual({ date: '2026-09-03', value: 84 })
    expect(s.latest).toEqual({ date: '2026-09-17', value: 80.5 })
    expect(s.change).toBe(-3.5)
    expect([s.min, s.max]).toEqual([80.5, 84])
  })
  it('is null with no points and zero change with one', () => {
    expect(summarize([])).toBeNull()
    expect(summarize([{ date: '2026-09-01', value: 70 }])!.change).toBe(0)
  })
})
