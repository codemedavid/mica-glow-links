import { describe, it, expect } from 'vitest'
import {
  CUSTOM_LINK_GROUPS,
  adminLinks,
  linkGroups,
  mergeCustomAdminLinks,
  mergeCustomLinks,
} from './homeLinks'

/**
 * Journeys:
 *  - As the shop owner, I want a link I add in the admin to appear inside the
 *    category I picked, so that I do not need a developer for a new button.
 *  - As the shop owner, I want to add another WhatsApp admin to the Contact
 *    dropdown, so that customers can reach whoever is on shift.
 */

const customLink = (overrides = {}) => ({
  id: 'custom-abc',
  groupId: 'shop',
  icon: '🛍️',
  title: 'Restock form',
  desc: 'Reserve your next batch',
  href: 'https://example.com/restock',
  ...overrides,
})

describe('CUSTOM_LINK_GROUPS — where the owner may add links', () => {
  it('offers every link category plus the contact dropdown', () => {
    expect(CUSTOM_LINK_GROUPS.map((group) => group.id)).toEqual([
      ...linkGroups.map((group) => group.id),
      'contact',
    ])
  })
})

describe('mergeCustomLinks — placing added links into their category', () => {
  it('appends a custom link after the built-in links of its category', () => {
    const shop = mergeCustomLinks(linkGroups, [customLink()]).find((group) => group.id === 'shop')

    expect(shop.links.at(-1)).toEqual({
      id: 'custom-abc',
      icon: '🛍️',
      title: 'Restock form',
      desc: 'Reserve your next batch',
      href: 'https://example.com/restock',
      kind: 'external',
      isCustom: true,
    })
    expect(shop.links).toHaveLength(linkGroups.find((group) => group.id === 'shop').links.length + 1)
  })

  it('gives an icon-less link a default icon so the row stays aligned', () => {
    const shop = mergeCustomLinks(linkGroups, [customLink({ icon: '' })]).find(
      (group) => group.id === 'shop'
    )

    expect(shop.links.at(-1).icon).toBe('🔗')
  })

  it('ignores links saved against a category that no longer exists', () => {
    expect(mergeCustomLinks(linkGroups, [customLink({ groupId: 'retired' })])).toEqual(linkGroups)
  })

  it('leaves contact links out of the link categories', () => {
    expect(mergeCustomLinks(linkGroups, [customLink({ groupId: 'contact' })])).toEqual(linkGroups)
  })

  it('does not change the bundled groups it was given', () => {
    const before = linkGroups.find((group) => group.id === 'shop').links.length

    mergeCustomLinks(linkGroups, [customLink()])

    expect(linkGroups.find((group) => group.id === 'shop').links).toHaveLength(before)
  })
})

describe('mergeCustomAdminLinks — extra WhatsApp admins', () => {
  it('appends contact links to the admin dropdown', () => {
    const merged = mergeCustomAdminLinks(adminLinks, [
      customLink({ id: 'custom-wa', groupId: 'contact', title: 'Admin Bea', href: 'https://wa.me/63900' }),
      customLink(),
    ])

    expect(merged).toHaveLength(adminLinks.length + 1)
    expect(merged.at(-1)).toEqual({
      id: 'custom-wa',
      title: 'Admin Bea',
      href: 'https://wa.me/63900',
      isCustom: true,
    })
  })
})
