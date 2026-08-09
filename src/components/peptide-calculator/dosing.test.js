import { describe, it, expect } from 'vitest'
import {
  buildTicks,
  calculateDose,
  convertDoseValue,
  formatDoseSummary,
  roundTo,
  TICK_COUNT,
} from './dosing'

/**
 * Journey: As someone reconstituting a peptide vial, I want to enter my vial
 * size, water volume, and target dose, so that I know exactly how far to draw
 * the plunger on my insulin syringe.
 */

// The design's reference case: 10 mg vial + 2 ml water, 250 mcg dose, 0.5 ml syringe.
const reference = {
  syringeMl: 0.5,
  vialMg: 10,
  waterMl: 2,
  doseValue: 250,
  doseUnit: 'mcg',
}

describe('calculateDose', () => {
  it('converts a vial and water volume into a concentration', () => {
    const { concMcgPerMl } = calculateDose(reference)

    expect(concMcgPerMl).toBe(5000)
  })

  it('turns the target dose into a draw volume and syringe units', () => {
    const { drawMl, units } = calculateDose(reference)

    expect(drawMl).toBeCloseTo(0.05, 10)
    expect(units).toBeCloseTo(5, 10)
  })

  it('reports how much of the syringe the dose fills', () => {
    const { fillRatio } = calculateDose(reference)

    expect(fillRatio).toBeCloseTo(0.1, 10)
  })

  it('counts whole doses available in the vial', () => {
    const { dosesPerVial } = calculateDose(reference)

    expect(dosesPerVial).toBe(40)
  })

  it('discards the partial dose left at the bottom of the vial', () => {
    const { dosesPerVial } = calculateDose({ ...reference, doseValue: 300 })

    expect(dosesPerVial).toBe(33)
  })

  it('reads a dose entered in mg as the equivalent micrograms', () => {
    const inMg = calculateDose({ ...reference, doseValue: 0.25, doseUnit: 'mg' })

    expect(inMg.doseMcg).toBe(250)
    expect(inMg.units).toBeCloseTo(5, 10)
  })

  it('flags a dose that will not fit in the chosen syringe', () => {
    const tooBig = calculateDose({
      syringeMl: 0.3,
      vialMg: 5,
      waterMl: 1,
      doseValue: 2.5,
      doseUnit: 'mg',
    })

    expect(tooBig.drawMl).toBeCloseTo(0.5, 10)
    expect(tooBig.isOverfilled).toBe(true)
  })

  it('clamps the fill ratio so the plunger stops at the end of the barrel', () => {
    const tooBig = calculateDose({
      syringeMl: 0.3,
      vialMg: 5,
      waterMl: 1,
      doseValue: 2.5,
      doseUnit: 'mg',
    })

    expect(tooBig.fillRatio).toBe(1)
  })

  it('does not flag a dose that exactly fills the syringe', () => {
    const exact = calculateDose({
      syringeMl: 0.5,
      vialMg: 5,
      waterMl: 1,
      doseValue: 2.5,
      doseUnit: 'mg',
    })

    expect(exact.drawMl).toBeCloseTo(0.5, 10)
    expect(exact.isOverfilled).toBe(false)
  })

  it('returns zeroes instead of dividing by zero when water is blank', () => {
    const blank = calculateDose({ ...reference, waterMl: 0 })

    expect(blank.concMcgPerMl).toBe(0)
    expect(blank.drawMl).toBe(0)
    expect(blank.units).toBe(0)
    expect(blank.fillRatio).toBe(0)
  })

  it('returns zero doses instead of dividing by zero when the dose is blank', () => {
    const blank = calculateDose({ ...reference, doseValue: 0 })

    expect(blank.dosesPerVial).toBe(0)
    expect(blank.drawMl).toBe(0)
  })

  it('treats empty custom-input text as zero rather than NaN', () => {
    const blank = calculateDose({ ...reference, vialMg: '', waterMl: '' })

    expect(blank.concMcgPerMl).toBe(0)
    expect(blank.units).toBe(0)
    expect(Number.isNaN(blank.units)).toBe(false)
  })

  it('accepts numeric text from the custom inputs', () => {
    const typed = calculateDose({ ...reference, vialMg: '10', waterMl: '2' })

    expect(typed.units).toBeCloseTo(5, 10)
  })
})

/**
 * Journey: As someone whose protocol is written in mg rather than mcg, I want
 * to switch units, so that I can enter the dose the way my protocol states it.
 */
describe('convertDoseValue', () => {
  it('converts micrograms to milligrams when switching to mg', () => {
    expect(convertDoseValue(250, 'mcg', 'mg')).toBe(0.25)
  })

  it('converts milligrams to micrograms when switching to mcg', () => {
    expect(convertDoseValue(0.25, 'mg', 'mcg')).toBe(250)
  })

  it('leaves the value alone when the unit has not changed', () => {
    expect(convertDoseValue(250, 'mcg', 'mcg')).toBe(250)
  })

  it('survives a round trip without drifting', () => {
    expect(convertDoseValue(convertDoseValue(250, 'mcg', 'mg'), 'mg', 'mcg')).toBe(250)
  })

  it('treats blank input as zero', () => {
    expect(convertDoseValue('', 'mcg', 'mg')).toBe(0)
  })
})

describe('roundTo', () => {
  it('drops trailing zeroes so a whole number reads as a whole number', () => {
    expect(roundTo(5, 1)).toBe('5')
  })

  it('keeps significant decimals', () => {
    expect(roundTo(0.05, 3)).toBe('0.05')
  })

  it('rounds to the requested precision', () => {
    expect(roundTo(0.126666, 2)).toBe('0.13')
  })
})

describe('buildTicks', () => {
  it('draws twenty gradations along the barrel', () => {
    expect(buildTicks(0.5)).toHaveLength(TICK_COUNT)
  })

  it('labels every fifth gradation and leaves the rest bare', () => {
    const labelled = buildTicks(0.5).filter((tick) => tick.isMajor)

    expect(labelled).toHaveLength(4)
    expect(buildTicks(0.5)[0].isMajor).toBe(false)
  })

  it('scales the labels to the chosen syringe so the last one is its capacity', () => {
    const labels = buildTicks(0.5)
      .filter((tick) => tick.isMajor)
      .map((tick) => tick.label)

    expect(labels).toEqual(['13', '25', '38', '50'])
  })

  it('rescales the labels for a 1 ml syringe', () => {
    const labels = buildTicks(1)
      .filter((tick) => tick.isMajor)
      .map((tick) => tick.label)

    expect(labels).toEqual(['25', '50', '75', '100'])
  })
})

describe('formatDoseSummary', () => {
  it('spells out the draw volume in ml, mcg and mg', () => {
    const { drawLine } = formatDoseSummary(calculateDose(reference), reference)

    expect(drawLine).toBe('Draw 0.05 ml to get 250 mcg (0.25 mg) per dose.')
  })

  it('reports concentration in mg per ml', () => {
    const { concLine } = formatDoseSummary(calculateDose(reference), reference)

    expect(concLine).toBe('5 mg/ml')
  })

  it('reports the units to draw and the fill percentage', () => {
    const summary = formatDoseSummary(calculateDose(reference), reference)

    expect(summary.unitsLabel).toBe('5')
    expect(summary.fillLine).toBe('10%')
    expect(summary.dosesLine).toBe('40 doses')
  })

  it('shows dashes and a prompt instead of zeroes when the form is incomplete', () => {
    const blank = { ...reference, waterMl: '' }
    const summary = formatDoseSummary(calculateDose(blank), blank)

    expect(summary.unitsLabel).toBe('—')
    expect(summary.concLine).toBe('—')
    expect(summary.fillLine).toBe('—')
    expect(summary.drawLine).toBe('Fill in the fields above to see your draw volume.')
  })

  it('still counts doses per vial without a water volume, since dilution does not change it', () => {
    const blank = { ...reference, waterMl: '' }
    const summary = formatDoseSummary(calculateDose(blank), blank)

    expect(summary.dosesLine).toBe('40 doses')
  })

  it('shows a dash for doses per vial when the vial size is blank', () => {
    const blank = { ...reference, vialMg: '' }
    const summary = formatDoseSummary(calculateDose(blank), blank)

    expect(summary.dosesLine).toBe('—')
  })

  it('describes the syringe gradations for the chosen barrel', () => {
    const summary = formatDoseSummary(calculateDose(reference), reference)

    expect(summary.syringeNote).toBe('A 0.5 ml insulin syringe is marked 0–50 units.')
  })

  it('explains how to fix a dose that overflows the syringe', () => {
    const tooBig = {
      syringeMl: 0.3,
      vialMg: 5,
      waterMl: 1,
      doseValue: 2.5,
      doseUnit: 'mg',
    }
    const { warningText } = formatDoseSummary(calculateDose(tooBig), tooBig)

    expect(warningText).toBe(
      'That dose needs 0.5 ml — more than your 0.3 ml syringe holds. Use less water or a larger syringe.'
    )
  })

  it('stays silent when the dose fits', () => {
    const { warningText } = formatDoseSummary(calculateDose(reference), reference)

    expect(warningText).toBe('')
  })
})
