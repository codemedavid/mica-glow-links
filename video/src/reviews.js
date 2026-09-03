// Curated source material for the VR Jonina social-proof reel.
//
// Editorial rules encoded here (and enforced by timeline.test.js):
//   - `transcript` is what is actually legible in the screenshot. `quote` is the
//     phrase the edit highlights and MUST be a substring of it, so nobody can
//     sharpen a testimonial into something the customer never wrote.
//   - `caption` is our own overlay text and must come from APPROVED_CAPTIONS.
//   - `crop` and `redactions` are fractions (0-1) of the ORIGINAL screenshot.
//     Redactions are painted first, then the crop is taken, so a redaction may
//     sit outside the visible window and still be harmless.
//
// The montage deliberately leads with delivery and service proof rather than
// body transformations: it is what the brief asks for ("real people ordering,
// receiving their orders") and it keeps the cut inside Meta/TikTok policy.
//
// No frame may show vials or product shots. Where a post was "short caption +
// photo of vials", the crop is pulled in to the message text alone; `visuals`
// records what each crop actually contains and is enforced by the tests.

export const APPROVED_CAPTIONS = [
  'Order received ✅',
  'Another happy customer 💚',
  'Community feedback',
  'Thank you for trusting us 🫶',
  'Another successful order',
]

// Subjects a crop is allowed to contain. There is deliberately no term for a
// vial or a product shot, so a crop that would show one cannot be described.
export const ALLOWED_VISUALS = ['message-text', 'parcel', 'raffle-prize']

// Ownership marking. All three alphas are deliberately low: the point is to
// make reposting awkward, not to sit on top of what customers wrote.
export const BRAND = {
  logo: 'brand-mark.png',
  tintAlpha: 0.08,
  watermarkAlpha: 0.06,
  backdropAlpha: 0.03,
}

const USERNAME_STRIP = { x: 0, y: 0, w: 0.4, h: 0.08 }

export const REVIEWS = [
  {
    id: 'r-second-gb',
    source: 'IMG_5836.heic',
    asset: 'r-second-gb.jpg',
    caption: 'Order received ✅',
    transcript:
      'Received my order, thank you so much! Special thanks to @Admin James for being so helpful even while on vacation, he still replies and assists. Very easy to talk to. This is already my second group buy with them and I am very satisfied!',
    quote: 'This is already my second group buy with them and I am very satisfied!',
    visuals: ['message-text'],
    crop: { x: 0.13, y: 0.045, w: 0.85, h: 0.375 },
    redactions: [USERNAME_STRIP],
    hasPrivateDetails: true,
  },
  {
    id: 'r-super-bilis',
    source: 'IMG_5842.heic',
    asset: 'r-super-bilis.jpg',
    caption: 'Another successful order',
    transcript: 'Thankee Nakshie @Mica .. as in super bilis.. Delivered GB 1/16..',
    quote: 'as in super bilis.. Delivered GB 1/16..',
    visuals: ['message-text', 'parcel'],
    crop: { x: 0.125, y: 0.035, w: 0.86, h: 0.87 },
    // A shorter strip than USERNAME_STRIP: on this taller screenshot 8% of the
    // height reaches down into the first line of the message. The second box
    // hides the itemised order list printed on the parcel label.
    redactions: [{ x: 0, y: 0, w: 0.4, h: 0.045 }, { x: 0.34, y: 0.5, w: 0.45, h: 0.13 }],
    hasPrivateDetails: true,
  },
  {
    id: 'r-third-order',
    source: 'IMG_5847.heic',
    asset: 'r-third-order.jpg',
    caption: 'Another happy customer 💚',
    transcript: 'Received ko na, pang 3rd ko ng order to. GB 1/02',
    quote: 'pang 3rd ko ng order to.',
    visuals: ['message-text', 'parcel'],
    crop: { x: 0.14, y: 0.035, w: 0.82, h: 0.89 },
    redactions: [{ x: 0, y: 0, w: 0.34, h: 0.055 }],
    hasPrivateDetails: true,
  },
  {
    id: 'r-first-time-buyer',
    source: 'IMG_5846.heic',
    asset: 'r-first-time-buyer.jpg',
    caption: 'Order received ✅',
    transcript:
      'Received GB 1 /9 . First time Buyer yes may stocks nako. Thank you Mama Mics & Admins',
    quote: 'First time Buyer yes may stocks nako.',
    visuals: ['message-text'],
    crop: { x: 0.13, y: 0.02, w: 0.84, h: 0.135 },
    redactions: [{ x: 0, y: 0, w: 0.34, h: 0.05 }],
    hasPrivateDetails: true,
  },
  {
    id: 'r-vancouver',
    source: 'IMG_5844.heic',
    asset: 'r-vancouver.jpg',
    caption: 'Community feedback',
    transcript: 'Finally mama mics! Love from Vancouver',
    quote: 'Love from Vancouver',
    visuals: ['message-text'],
    crop: { x: 0.12, y: 0.015, w: 0.85, h: 0.115 },
    redactions: [{ x: 0, y: 0, w: 0.3, h: 0.045 }],
    hasPrivateDetails: true,
  },
  {
    id: 'r-trusted-five-times',
    source: 'IMG_5845.heic',
    asset: 'r-trusted-five-times.jpg',
    caption: 'Thank you for trusting us 🫶',
    transcript:
      'And grabe ang bait ni Mica! She really granted my request without no hesitation. I know she is genuine sa lahat ng ginagawa nya especially on these Groupbuys, kaya kahit andami na ibang nagpapa GB, dito lang talaga ako umo-order, mga more than 5 times na din! Aside from Mica & her team are super nice, I trust them too!',
    quote: 'dito lang talaga ako umo-order, mga more than 5 times na din!',
    visuals: ['message-text'],
    crop: { x: 0.14, y: 0.175, w: 0.83, h: 0.33 },
    redactions: [{ x: 0, y: 0, w: 0.35, h: 0.06 }],
    hasPrivateDetails: true,
  },
  {
    id: 'r-third-transaction',
    source: '484e9e9c-8f08-4942-ab0c-334ae9c81e59.JPG',
    asset: 'r-third-transaction.jpg',
    caption: 'Another happy customer 💚',
    transcript:
      'Thank you mama mics! nabigla ako sa message ni admin Phoebe, paulit ulit ko pang tiningnan kasi akala ko lutang lang ako dahil nakainom na akong melatonin. Hahaha 3rd transaction ko na po ito sainyo.',
    quote: '3rd transaction ko na po ito sainyo.',
    visuals: ['message-text'],
    crop: { x: 0, y: 0, w: 1, h: 0.315 },
    redactions: [],
    hasPrivateDetails: false,
  },
  {
    id: 'r-two-gbs',
    source: 'IMG_5848.heic',
    asset: 'r-two-gbs.jpg',
    caption: 'Order received ✅',
    transcript:
      '12/19 and 1/2 GB received ! Thank you so much mama Mics & sir James and Admins Godbless po',
    quote: '12/19 and 1/2 GB received !',
    visuals: ['message-text'],
    crop: { x: 0.13, y: 0.025, w: 0.84, h: 0.14 },
    redactions: [{ x: 0, y: 0, w: 0.32, h: 0.05 }],
    hasPrivateDetails: true,
  },
  {
    id: 'r-raffle-scale',
    source: 'IMG_5838.heic',
    asset: 'r-raffle-scale.jpg',
    caption: 'Another successful order',
    transcript:
      'Received my 12/19 raffle prize. Yay thanks @Mica and @Admin Glia (Mindanao Indi & GB)',
    quote: 'Received my 12/19 raffle prize.',
    visuals: ['message-text', 'raffle-prize'],
    crop: { x: 0.1, y: 0.01, w: 0.88, h: 0.95 },
    redactions: [{ x: 0, y: 0, w: 0.28, h: 0.05 }],
    hasPrivateDetails: true,
  },
  {
    id: 'r-raffle-tr30',
    source: 'IMG_5837.heic',
    asset: 'r-raffle-tr30.jpg',
    caption: 'Another happy customer 💚',
    transcript:
      'Got my raffle prize for the first time in my 31 years of existence! From TR20 to TR30 talaga binigay ni Mica. Thank you so much!!',
    quote: 'Got my raffle prize for the first time in my 31 years of existence!',
    visuals: ['message-text'],
    crop: { x: 0.13, y: 0.015, w: 0.84, h: 0.095 },
    redactions: [{ x: 0, y: 0, w: 0.3, h: 0.045 }],
    hasPrivateDetails: true,
  },
  {
    id: 'r-raffle-printer',
    source: 'IMG_5843.heic',
    asset: 'r-raffle-printer.jpg',
    caption: 'Community feedback',
    transcript: 'Thank you',
    quote: 'Thank you',
    visuals: ['message-text', 'raffle-prize'],
    crop: { x: 0.1, y: 0.01, w: 0.88, h: 0.93 },
    redactions: [{ x: 0, y: 0, w: 0.32, h: 0.05 }],
    hasPrivateDetails: true,
  },
  {
    id: 'r-thank-you-parcel',
    source: 'IMG_5841.heic',
    asset: 'r-thank-you-parcel.jpg',
    caption: 'Order received ✅',
    transcript: 'GB 1/2/26 Received yesterday thanks Ms Mica and Admins',
    quote: 'GB 1/2/26 Received yesterday',
    visuals: ['message-text', 'parcel'],
    crop: { x: 0.08, y: 0.02, w: 0.88, h: 0.95 },
    redactions: [{ x: 0, y: 0, w: 0.3, h: 0.06 }],
    hasPrivateDetails: true,
  },
  {
    id: 'r-gb-raffle-haul',
    source: 'IMG_5840.heic',
    asset: 'r-gb-raffle-haul.jpg',
    caption: 'Another successful order',
    transcript: 'Got my GB 1/9 and ang napanalunan sa raffle na TR30! Salamat po! @Mica',
    quote: 'Got my GB 1/9 and ang napanalunan sa raffle na TR30!',
    visuals: ['message-text'],
    crop: { x: 0.13, y: 0.015, w: 0.84, h: 0.08 },
    redactions: [{ x: 0, y: 0, w: 0.3, h: 0.05 }],
    hasPrivateDetails: true,
  },
]

export const HOOK = {
  line: "Don't just take our word for it 👀",
  sub: 'Here is what our community has been saying.',
}

export const CTA = {
  url: 'https://vrjonina.pepweb.store',
  // The community site sits under the join line as a secondary destination.
  // The store URL stays the large primary call to action, so this is set
  // smaller and the gap is enforced by test.
  communityUrl: 'mamamicaglw.com',
  urlSize: 58,
  communityUrlSize: 40,
  lines: [
    'Ready to start your journey with us? 💚',
    'Join our community today.',
    'Want to order and receive your order ASAP?',
    'Visit:',
    'See you inside the community. 🫶',
  ],
}

export function findReview(id) {
  const review = REVIEWS.find((candidate) => candidate.id === id)
  if (!review) throw new Error(`Unknown review id: ${id}`)
  return review
}
