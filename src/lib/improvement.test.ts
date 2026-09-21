import { describe, expect, it } from 'vitest'
import { CLAMP_PERCENT, bestByWeek, improvement, improvementSeries, lastWeeks, weekKey } from './improvement'
import type { FullLog, SetLog } from './api'

let nextId = 1
const set = (key: string, weight: number | null, reps: number | null, over: Partial<SetLog> = {}): SetLog => ({
  exercise_key: key,
  exercise_name: key.replace(/-/g, ' '),
  set_number: 1,
  weight_kg: weight,
  reps,
  done: true,
  ...over,
})
const log = (date: string, sets: SetLog[]): FullLog => ({
  id: nextId++, user_id: 1, log_date: date, day_number: 1, day_title: null, day_type: null, completed: true,
  duration_min: null, cardio_min: null, notes: null, set_logs: sets,
})

// Weeks (Monday-based): 2026-09-14, 2026-09-21, 2026-09-28
const LAST = '2026-09-16' // Wednesday of the week starting 2026-09-14
const THIS = '2026-09-23' // Wednesday of the week starting 2026-09-21
const THIS_WEEK = '2026-09-21'

describe('weekKey', () => {
  it('maps any day to the Monday of its week (Sunday belongs to the week before)', () => {
    expect(weekKey('2026-09-21')).toBe('2026-09-21') // Mon
    expect(weekKey('2026-09-23')).toBe('2026-09-21') // Wed
    expect(weekKey('2026-09-27')).toBe('2026-09-21') // Sun
    expect(weekKey('2026-09-28')).toBe('2026-09-28') // next Mon
  })
  it('works across month and year boundaries', () => {
    expect(weekKey('2027-01-01')).toBe('2026-12-28')
    expect(weekKey('2026-10-01')).toBe('2026-09-28')
  })
})

describe('lastWeeks', () => {
  it('lists the last n Mondays ending with the current week, oldest first', () => {
    expect(lastWeeks(new Date(2026, 8, 23), 3)).toEqual(['2026-09-07', '2026-09-14', '2026-09-21'])
    expect(lastWeeks(new Date(2026, 8, 27), 1)).toEqual(['2026-09-21'])
  })
})

describe('improvement', () => {
  it('compares the best estimated 1RM with the previous week, as a percentage', () => {
    const logs = [log(LAST, [set('bench', 100, 5)]), log(THIS, [set('bench', 105, 5)])]
    const r = improvement(logs, THIS_WEEK)
    expect(r.compared).toHaveLength(1)
    expect(r.compared[0].before).toBeCloseTo(116.67, 1)
    expect(r.compared[0].after).toBeCloseTo(122.5, 1)
    expect(r.score).toBeCloseTo(5, 5)
  })

  it('goes negative when someone is weaker than the week before', () => {
    const logs = [log(LAST, [set('bench', 100, 5)]), log(THIS, [set('bench', 95, 5)])]
    expect(improvement(logs, THIS_WEEK).score).toBeCloseTo(-5, 5)
  })

  it('is zero when nothing changed', () => {
    const logs = [log(LAST, [set('bench', 80, 8)]), log(THIS, [set('bench', 80, 8)])]
    expect(improvement(logs, THIS_WEEK).score).toBeCloseTo(0, 10)
  })

  it('uses the best of the week (by estimated 1RM), across several sessions and sets', () => {
    const logs = [
      log(LAST, [set('bench', 100, 5)]),
      log('2026-09-21', [set('bench', 100, 3)]), // e1rm 110
      log('2026-09-25', [set('bench', 90, 10)]), // e1rm 120 <- best this week
    ]
    expect(bestByWeek(logs).get(THIS_WEEK)!.get('bench')!.e1rm).toBeCloseTo(120, 5)
  })

  it('ignores sets that were not ticked, and sets without weight or reps', () => {
    const logs = [
      log(LAST, [set('bench', 100, 5)]),
      log(THIS, [set('bench', 200, 5, { done: false }), set('bench', null, 5), set('bench', 100, null), set('bench', 0, 10), set('bench', 100, 0)]),
    ]
    const r = improvement(logs, THIS_WEEK)
    expect(r.score).toBeNull()
    expect(r.compared).toEqual([])
  })

  it('only compares exercises done in both weeks', () => {
    const logs = [log(LAST, [set('bench', 100, 5), set('row', 60, 8)]), log(THIS, [set('bench', 100, 5), set('curl', 20, 10)])]
    const r = improvement(logs, THIS_WEEK)
    expect(r.compared.map((c) => c.key)).toEqual(['bench'])
  })

  it('is null (not zero) when there is nothing to compare', () => {
    expect(improvement([], THIS_WEEK).score).toBeNull()
    expect(improvement([log(THIS, [set('bench', 100, 5)])], THIS_WEEK).score).toBeNull() // no previous week
    expect(improvement([log(LAST, [set('bench', 100, 5)]), log(THIS, [set('row', 60, 8)])], THIS_WEEK).score).toBeNull()
  })

  it('does not look further back than the immediately previous week', () => {
    const logs = [log('2026-09-09', [set('bench', 100, 5)]), log(THIS, [set('bench', 120, 5)])] // two weeks apart
    expect(improvement(logs, THIS_WEEK).score).toBeNull()
  })

  it('averages the exercises', () => {
    const logs = [
      log(LAST, [set('bench', 100, 1), set('squat', 100, 1)]),
      log(THIS, [set('bench', 110, 1), set('squat', 96, 1)]), // +10% and -4%
    ]
    const r = improvement(logs, THIS_WEEK)
    expect(r.score).toBeCloseTo(3, 5)
    expect(r.compared.map((c) => c.key)).toEqual(['bench', 'squat'])
    expect(r.compared[0].percent).toBeGreaterThan(r.compared[1].percent)
  })

  it('caps one exercise at ±50% so a typo cannot dominate', () => {
    const up = [log(LAST, [set('bench', 50, 1)]), log(THIS, [set('bench', 500, 1)])]
    expect(improvement(up, THIS_WEEK).score).toBe(CLAMP_PERCENT)
    const down = [log(LAST, [set('bench', 500, 1)]), log(THIS, [set('bench', 5, 1)])]
    expect(improvement(down, THIS_WEEK).score).toBe(-CLAMP_PERCENT)
  })

  it('does not depend on how heavy someone lifts: the same relative gain scores the same', () => {
    const light = [log(LAST, [set('curl', 10, 10)]), log(THIS, [set('curl', 10.5, 10)])] // +5%
    const heavy = [log(LAST, [set('squat', 200, 10)]), log(THIS, [set('squat', 210, 10)])] // +5%
    expect(improvement(light, THIS_WEEK).score).toBeCloseTo(improvement(heavy, THIS_WEEK).score!, 10)
  })

  it('does not depend on how often someone trains: extra sessions with the same best change nothing', () => {
    const rare = [log(LAST, [set('bench', 100, 5)]), log(THIS, [set('bench', 105, 5)])]
    const often = [
      log(LAST, [set('bench', 100, 5)]), log('2026-09-17', [set('bench', 70, 5)]), log('2026-09-19', [set('bench', 60, 8)]),
      log(THIS, [set('bench', 105, 5)]), log('2026-09-24', [set('bench', 80, 8)]), log('2026-09-26', [set('bench', 60, 5)]),
    ]
    expect(improvement(often, THIS_WEEK).score).toBeCloseTo(improvement(rare, THIS_WEEK).score!, 10)
  })
})

describe('improvementSeries', () => {
  it('gives one entry per week, null where there is no earlier week to compare with', () => {
    const logs = [
      log('2026-09-08', [set('bench', 100, 5)]),
      log(LAST, [set('bench', 102, 5)]),
      log(THIS, [set('bench', 104, 5)]),
    ]
    const weeks = ['2026-09-07', '2026-09-14', '2026-09-21']
    const series = improvementSeries(logs, weeks)
    expect(series.map((w) => w.week)).toEqual(weeks)
    expect(series[0].score).toBeNull()
    expect(series[1].score).toBeGreaterThan(0)
    expect(series[2].score).toBeGreaterThan(0)
  })
})
