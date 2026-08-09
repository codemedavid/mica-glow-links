export const COMMUNITY_URL = 'https://t.me/+YqOUF5FOwK9jNDE9'
export const MASTERCLASS_URL =
  'https://docs.google.com/document/d/13ZxEBVB8vavnWMsOn0btVwSt4k2tV45v/edit'
export const CONSULTATION_URL = 'https://nowserving.seriousmd.com/doctor/andrei-francis-flandes'

export const groupBuyLink = {
  id: 'group-buy',
  title: 'Hurry! Group buy is now OPEN.',
  desc: 'Not in our community yet? This takes you straight there.',
  href: COMMUNITY_URL,
}

// Homepage links grouped into labeled sections (Links.dc.html design).
// kind: 'external' opens a new tab, 'route' navigates a hash view,
// 'protected' opens the access-code gate before the masterclass.
// variant: optional modifier class for links that need their own accent.
export const linkGroups = [
  {
    id: 'consult',
    label: 'CONSULT',
    links: [
      {
        id: 'book-consultation',
        icon: '🩺',
        title: 'Book a Consultation',
        desc: 'GLP-1 guidance with Dr. Andrei Francis Flandes',
        href: CONSULTATION_URL,
        kind: 'external',
        variant: 'consult',
      },
    ],
  },
  {
    id: 'shop',
    label: 'SHOP',
    links: [
      {
        id: 'price-list',
        icon: '💜',
        title: 'Price List',
        desc: 'Full catalog with updated per-vial pricing',
        href: 'https://docs.google.com/spreadsheets/d/1Akr_wwyNCsMjfKLsEINCNU54Ln61kXM2cfxhKUVwLuk/edit?gid=0#gid=0',
        kind: 'external',
      },
      {
        id: 'order-calculator',
        icon: '🧾',
        title: 'Order Calculator',
        desc: 'Build your order and see your total instantly',
        href: '#order',
        kind: 'route',
      },
    ],
  },
  {
    id: 'community',
    label: 'COMMUNITY',
    links: [
      {
        id: 'telegram-community',
        icon: '💬',
        title: 'Join Community',
        desc: 'Group buy announcements, Q&A, and support',
        href: COMMUNITY_URL,
        kind: 'external',
      },
      {
        id: 'customer-reviews',
        icon: '⭐',
        title: 'Customer Reviews',
        desc: 'Real deliveries and community wins',
        href: '#reviews',
        kind: 'route',
      },
    ],
  },
  {
    id: 'learn',
    label: 'LEARN & VERIFY',
    links: [
      {
        id: 'peptide-calculator',
        icon: '💉',
        title: 'Peptide Calculator',
        desc: 'Reconstitution and dosing - see your exact draw',
        href: '#peptide',
        kind: 'route',
      },
      {
        id: 'video-tutorials',
        icon: '🎥',
        title: 'Video Tutorials',
        desc: 'Watch & learn - reconstitution, pens, and dosing',
        href: '#tutorials',
        kind: 'route',
      },
      {
        id: 'e-guides',
        icon: '📘',
        title: 'Electronic Guides',
        desc: 'Step-by-step guides and references',
        href: 'https://drive.google.com/drive/folders/1tNuXfOSXyQyyck7BK-BqZNIbvNBpLgXR',
        kind: 'external',
      },
      {
        id: 'coa',
        icon: '📋',
        title: 'COA',
        desc: 'Certificates of analysis and lab tests',
        href: 'https://drive.google.com/drive/folders/18cfTEy6FIXlJTcrxoPpeRlr-BzbTG4Kn',
        kind: 'external',
      },
      {
        id: 'access-doc',
        icon: '🔐',
        title: 'Advance Peptide Masterclass',
        desc: 'Exclusive access for members',
        href: MASTERCLASS_URL,
        kind: 'protected',
      },
    ],
  },
]

export const adminLinks = [
  { id: 'admin-phoebe', title: 'Admin Phoebe', href: 'https://api.whatsapp.com/send?phone=639686450947' },
  { id: 'admin-glia', title: 'Admin Glia', href: 'https://api.whatsapp.com/send?phone=639062364792' },
  { id: 'admin-james', title: 'Admin James', href: 'https://api.whatsapp.com/send?phone=639054620846' },
  { id: 'admin-danica', title: 'Admin Danica', href: 'https://api.whatsapp.com/send?phone=639302121321' },
  { id: 'admin-jonina', title: 'Admin Jonina', href: 'https://api.whatsapp.com/send?phone=639058429200' },
]

export const contactAdminLink = {
  id: 'contact-admin',
  title: 'Contact Admin',
  desc: 'Message a Mica Glow admin on WhatsApp',
}

export function applyLinkOverride(link, overrides = {}) {
  const override = overrides[link.id]
  if (!override || typeof override !== 'object') return link

  return {
    ...link,
    title: typeof override.title === 'string' && override.title.trim() ? override.title : link.title,
    text: typeof override.title === 'string' && override.title.trim() ? override.title : link.text,
    desc: typeof override.desc === 'string' ? override.desc : link.desc,
    href: typeof override.href === 'string' && override.href.trim() ? override.href : link.href,
  }
}

export function applyGroupOverrides(groups, overrides = {}) {
  return groups.map((group) => ({
    ...group,
    links: group.links.map((link) => applyLinkOverride(link, overrides)),
  }))
}

export function applyAdminLinkOverrides(links, overrides = {}) {
  return links.map((link) => applyLinkOverride(link, overrides))
}

export const homeControls = [
  {
    id: 'featured',
    label: 'Featured',
    links: [
      {
        ...groupBuyLink,
        adminDesc: 'The animated banner above the links.',
        canEditHref: true,
      },
    ],
  },
  ...linkGroups.map((group) => ({
    id: group.id,
    label: group.label,
    links: group.links.map(({ id, title, desc, href, kind }) => ({
      id,
      title,
      desc,
      href,
      kind,
      canEditHref: kind === 'external' || kind === 'protected',
    })),
  })),
  {
    id: 'contact',
    label: 'CONTACT',
    links: [
      {
        ...contactAdminLink,
        adminDesc: 'The dropdown button for WhatsApp admins.',
        canEditHref: false,
      },
      ...adminLinks.map(({ id, title, href }) => ({
        id,
        title,
        desc: 'Individual WhatsApp admin contact.',
        href,
        canEditHref: true,
      })),
    ],
  },
]

export const homeLinkIds = homeControls.flatMap((group) => group.links.map((link) => link.id))
