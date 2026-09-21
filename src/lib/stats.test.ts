import { describe, expect, it } from 'vitest'
import { addDays, currentStreak, fmtKg, isoDate, personalRecords, volumeOf, weekStart } from './stats'
import { defaultDayFor } from './program'
import type { SetLog, WorkoutLog } from './api'

const set = (over: Partial<SetLog> = {}): SetLog => ({
  exercise_key: 'bench-press',
  exercise_name: 'Bench Press',
  set_number: 1,
  weight_kg: 60,
  reps: 8,
  done: true,
  ...over,
})

const log = (date: string, completed = true): WorkoutLog => ({
  id: 1, user_id: 1, log_date: date, day_number: 1, day_title: null, day_type: null, completed, duration_min: null, cardio_min: null, notes: null,
})

describe('dates', () => {
  it('isoDate formats local dates with zero padding', () => {
    expect(isoDate(new Date(2026, 8, 21))).toBe('2026-09-21')
    expect(isoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
  it('addDays crosses month boundaries', () => {
    expect(isoDate(addDays(new Date(2026, 8, 30), 2))).toBe('2026-10-02')
    expect(isoDate(addDays(new Date(2026, 8, 1), -1))).toBe('2026-08-31')
  })
  it('weekStart is the Monday of that week (Sunday belongs to the previous Monday)', () => {
    expect(isoDate(weekStart(new Date(2026, 8, 23)))).toBe('2026-09-21') // Wed
    expect(isoDate(weekStart(new Date(2026, 8, 21)))).toBe('2026-09-21') // Mon
    expect(isoDate(weekStart(new Date(2026, 8, 27)))).toBe('2026-09-21') // Sun
  })
})

describe('defaultDayFor', () => {
  it('maps Monday..Saturday to Day 1..6 and Sunday to Day 7', () => {
    expect(defaultDayFor(new Date(2026, 8, 21))).toBe(1) // Mon
    expect(defaultDayFor(new Date(2026, 8, 26))).toBe(6) // Sat
    expect(defaultDayFor(new Date(2026, 8, 27))).toBe(7) // Sun
  })
})

describe('volumeOf', () => {
  it('sums weight × reps for done sets only', () => {
    expect(volumeOf([set(), set({ weight_kg: 50, reps: 10 })])).toBe(60 * 8 + 500)
  })
  it('ignores undone sets and sets missing weight or reps', () => {
    expect(volumeOf([set({ done: false }), set({ weight_kg: null }), set({ reps: null })])).toBe(0)
  })
  it('is zero for no sets', () => {
    expect(volumeOf([])).toBe(0)
  })
})

describe('currentStreak', () => {
  const today = new Date(2026, 8, 21)
  it('is 0 with no workouts', () => {
    expect(currentStreak([], today)).toBe(0)
  })
  it('counts back from yesterday when today is not done yet', () => {
    expect(currentStreak([log('2026-09-20'), log('2026-09-19'), log('2026-09-18')], today)).toBe(3)
  })
  it('includes today when done', () => {
    expect(currentStreak([log('2026-09-21'), log('2026-09-20')], today)).toBe(2)
  })
  it('a single rest day does not break the streak', () => {
    expect(currentStreak([log('2026-09-21'), log('2026-09-19'), log('2026-09-18')], today)).toBe(3)
  })
  it('two missed days break it', () => {
    expect(currentStreak([log('2026-09-21'), log('2026-09-18')], today)).toBe(1)
  })
  it('does not count unfinished workouts', () => {
    expect(currentStreak([log('2026-09-21', false), log('2026-09-20', false)], today)).toBe(0)
  })
  it('is 0 when the last workout was long ago', () => {
    expect(currentStreak([log('2026-08-01')], today)).toBe(0)
  })
})

describe('personalRecords', () => {
  const withDate = (s: SetLog, log_date: string) => ({ ...s, log_date })
  it('keeps the best estimated 1RM per exercise, not just the heaviest', () => {
    const prs = personalRecords([
      withDate(set({ weight_kg: 100, reps: 3 }), '2026-09-01'), // e1rm 110
      withDate(set({ weight_kg: 90, reps: 10 }), '2026-09-08'), // e1rm 120
    ])
    expect(prs).toHaveLength(1)
    expect(prs[0].weight_kg).toBe(90)
    expect(prs[0].date).toBe('2026-09-08')
    expect(prs[0].est1rm).toBeCloseTo(120, 5)
  })
  it('ignores undone sets and sets without weight or reps', () => {
    expect(personalRecords([withDate(set({ done: false }), 'x'), withDate(set({ weight_kg: 0 }), 'x'), withDate(set({ reps: null }), 'x')])).toEqual([])
  })
  it('separates exercises and sorts by name', () => {
    const prs = personalRecords([
      withDate(set({ exercise_key: 'squat', exercise_name: 'Squat' }), 'x'),
      withDate(set({ exercise_key: 'bench', exercise_name: 'Bench' }), 'x'),
    ])
    expect(prs.map((p) => p.exercise_name)).toEqual(['Bench', 'Squat'])
  })
})

describe('fmtKg', () => {
  it('rounds to one decimal and drops trailing zeros', () => {
    expect(fmtKg(62.54)).toBe('62.5')
    expect(fmtKg(60)).toBe('60')
    expect(fmtKg(61.96)).toBe('62')
  })
})
