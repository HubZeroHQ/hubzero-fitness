import { describe, expect, it } from 'vitest'
import { ageFrom, bmi, bmiAsia, bmiWho, bmr, e1rm, healthyRange, navyBodyFat } from './health'

describe('bmi', () => {
  it('computes kg / m²', () => {
    expect(bmi(78, 175)).toBeCloseTo(25.47, 2)
    expect(bmi(60, 160)).toBeCloseTo(23.44, 2)
    expect(bmi(100, 200)).toBeCloseTo(25, 5)
  })
})

describe('bmiWho categories', () => {
  it.each([
    [18.4, 'Underweight'],
    [18.5, 'Normal'],
    [24.9, 'Normal'],
    [25, 'Overweight'],
    [29.9, 'Overweight'],
    [30, 'Obese'],
  ])('%s is %s', (value, label) => {
    expect(bmiWho(value).label).toBe(label)
  })
})

describe('bmiAsia categories (Asia-Pacific cut-offs)', () => {
  it.each([
    [18.4, 'Underweight'],
    [18.5, 'Normal'],
    [22.9, 'Normal'],
    [23, 'Overweight (at risk)'],
    [24.9, 'Overweight (at risk)'],
    [25, 'Obese'],
  ])('%s is %s', (value, label) => {
    expect(bmiAsia(value).label).toBe(label)
  })

  it('is stricter than WHO between 23 and 25', () => {
    expect(bmiWho(24).label).toBe('Normal')
    expect(bmiAsia(24).label).not.toBe('Normal')
  })
})

describe('healthyRange', () => {
  it('uses BMI 18.5–22.9 for Asia-Pacific and 18.5–24.9 for WHO', () => {
    const [aLo, aHi] = healthyRange(175, true)
    expect(aLo).toBeCloseTo(56.66, 1)
    expect(aHi).toBeCloseTo(70.13, 1)
    const [wLo, wHi] = healthyRange(175, false)
    expect(wLo).toBeCloseTo(56.66, 1)
    expect(wHi).toBeCloseTo(76.26, 1)
  })
})

describe('ageFrom', () => {
  it('counts whole years and respects the birthday', () => {
    expect(ageFrom('2000-06-15', new Date(2026, 5, 14))).toBe(25)
    expect(ageFrom('2000-06-15', new Date(2026, 5, 15))).toBe(26)
    expect(ageFrom('2000-06-15', new Date(2026, 11, 31))).toBe(26)
  })
})

describe('bmr (Mifflin-St Jeor)', () => {
  it('matches the formula for men and women', () => {
    expect(bmr(78, 175, 26, 'male')).toBeCloseTo(1748.75, 2)
    expect(bmr(78, 175, 26, 'female')).toBeCloseTo(1582.75, 2)
  })
})

describe('e1rm (Epley)', () => {
  it('returns the weight itself for a single', () => {
    expect(e1rm(100, 1)).toBe(100)
  })
  it('adds reps/30', () => {
    expect(e1rm(100, 10)).toBeCloseTo(133.33, 2)
    expect(e1rm(60, 8)).toBeCloseTo(76, 5)
  })
})

describe('navyBodyFat', () => {
  it('estimates male body fat', () => {
    expect(navyBodyFat('male', 175, 85, 38)).toBeCloseTo(16.9, 0)
  })
  it('estimates female body fat and needs hip', () => {
    expect(navyBodyFat('female', 165, 75, 32)).toBeNull()
    const bf = navyBodyFat('female', 165, 75, 32, 98)
    expect(bf).not.toBeNull()
    expect(bf!).toBeGreaterThan(15)
    expect(bf!).toBeLessThan(40)
  })
  it('rejects impossible measurements', () => {
    expect(navyBodyFat('male', 175, 35, 38)).toBeNull()
  })
})
