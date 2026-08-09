import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

const BOOKING_URL = 'https://nowserving.seriousmd.com/doctor/andrei-francis-flandes'

/**
 * Journey: As a community member considering GLP-1, I want to book a
 * consultation with Dr. Andrei Francis Flandes straight from the links page,
 * so that I can get medical guidance before ordering.
 */
describe('Book a Consultation link', () => {
  beforeEach(() => {
    window.location.hash = ''
    render(<App />)
  })

  it('is visible on the home view', () => {
    expect(screen.getByRole('link', { name: /book a consultation/i })).toBeVisible()
  })

  it('points to the doctor booking page', () => {
    const link = screen.getByRole('link', { name: /book a consultation/i })

    expect(link).toHaveAttribute('href', BOOKING_URL)
  })

  it('opens in a new tab without leaking the opener', () => {
    const link = screen.getByRole('link', { name: /book a consultation/i })

    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('names the doctor so visitors know who they are booking with', () => {
    const link = screen.getByRole('link', { name: /book a consultation/i })

    expect(link).toHaveTextContent(/dr\.?\s*andrei francis flandes/i)
  })
})

/**
 * Journey: As a community member who has just received a vial, I want to reach
 * the peptide calculator from the links page, so that I can work out my dose
 * before mixing anything.
 */
describe('Peptide Calculator link', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  it('is offered on the links page', () => {
    render(<App />)

    expect(screen.getByRole('link', { name: /peptide calculator/i })).toBeVisible()
  })

  it('opens the calculator when the link is followed', () => {
    window.location.hash = '#peptide'
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Peptide Calculator' })).toBeVisible()
  })

  it('keeps the links page as the default view', () => {
    render(<App />)

    expect(
      screen.queryByRole('heading', { level: 1, name: 'Peptide Calculator' })
    ).not.toBeInTheDocument()
  })
})

/**
 * Journey: As a community member who is unsure how to mix or inject, I want to
 * reach the video tutorials from the links page, so that I can watch the
 * technique before I try it myself.
 */
describe('Video Tutorials link', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  it('is offered on the links page', () => {
    render(<App />)

    expect(screen.getByRole('link', { name: /video tutorials/i })).toBeVisible()
  })

  it('points at the tutorials view', () => {
    render(<App />)

    expect(screen.getByRole('link', { name: /video tutorials/i })).toHaveAttribute(
      'href',
      '#tutorials'
    )
  })

  it('opens the tutorials page when the link is followed', () => {
    window.location.hash = '#tutorials'
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Peptide Tutorials' })).toBeVisible()
  })

  it('keeps the links page as the default view', () => {
    render(<App />)

    expect(
      screen.queryByRole('heading', { level: 1, name: 'Peptide Tutorials' })
    ).not.toBeInTheDocument()
  })
})
