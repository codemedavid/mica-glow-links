import { describe, it, expect } from 'vitest'
import { matchesSearch, normalizeForSearch, splitHighlights } from './textSearch'

/**
 * Journey: As a visitor typing into a search box on my phone, I want sloppy
 * input — wrong case, extra spaces, words out of order — to still find the
 * video I mean.
 */

describe('normalizeForSearch', () => {
  it('ignores case, accents and repeated spaces', () => {
    expect(normalizeForSearch('  Réconstitution   GUIDE ')).toBe('reconstitution guide')
  })

  it('treats a missing value as empty text', () => {
    expect(normalizeForSearch(undefined)).toBe('')
  })
})

describe('matchesSearch', () => {
  const fields = ['Changing a pen cartridge', 'Swapping an empty cartridge', 'Peptide pens']

  it('matches everything when the query is blank', () => {
    expect(matchesSearch(fields, '   ')).toBe(true)
  })

  it('matches words in any order and across fields', () => {
    expect(matchesSearch(fields, 'peptide cartridge')).toBe(true)
  })

  it('matches the start of a word typed so far', () => {
    expect(matchesSearch(fields, 'cartr')).toBe(true)
  })

  it('requires every word to appear somewhere', () => {
    expect(matchesSearch(fields, 'cartridge syringe')).toBe(false)
  })

  it('skips missing fields instead of throwing', () => {
    expect(matchesSearch(['Dosing', null, undefined], 'dosing')).toBe(true)
  })
})

describe('splitHighlights', () => {
  it('marks every occurrence of each query word, keeping the original casing', () => {
    expect(splitHighlights('Drawing your dose in units', 'DOSE units')).toEqual([
      { text: 'Drawing your ', isMatch: false },
      { text: 'dose', isMatch: true },
      { text: ' in ', isMatch: false },
      { text: 'units', isMatch: true },
    ])
  })

  it('returns the text untouched for a blank query', () => {
    expect(splitHighlights('Storage', '  ')).toEqual([{ text: 'Storage', isMatch: false }])
  })

  it('treats regex characters in the query as plain text', () => {
    expect(splitHighlights('0.3 ml (small)', '(small)')).toEqual([
      { text: '0.3 ml ', isMatch: false },
      { text: '(small)', isMatch: true },
    ])
  })
})
