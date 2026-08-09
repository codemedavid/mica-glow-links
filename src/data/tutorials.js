// Tutorial library for the Tutorials page.
// Ported from "Tutorials.dc.html" in the Mama Mica GLW design project.
//
// Videos are hosted on YouTube as unlisted uploads and embedded through the
// privacy-enhanced youtube-nocookie domain. YouTube carries the bandwidth and
// serves a lower-quality stream to members on weak mobile data, which self-
// hosting an 8-minute file cannot do.
//
// youtubeId stays null until a video is actually published. A null id renders a
// "Coming soon" card, so no card is ever a dead link. To publish a tutorial,
// paste the 11-character id from its watch URL — the part after "v=" in
// https://www.youtube.com/watch?v=XXXXXXXXXXX — and nothing else needs to change.

/** @typedef {"Reconstitution"|"Peptide pens"|"Dosing"|"Storage"} TutorialCategory */

/**
 * @typedef {Object} Tutorial
 * @property {string} id       Stable slug, used as the React key.
 * @property {string} title    Card heading, one line.
 * @property {string} desc     What the viewer will learn.
 * @property {TutorialCategory} category  Drives the filter chips.
 * @property {string} length   Runtime as m:ss.
 * @property {string|null} youtubeId  Bare 11-character id, or null while unpublished.
 * @property {boolean} isFeatured  Exactly one tutorial leads the page.
 */

/** @type {readonly TutorialCategory[]} */
export const TUTORIAL_CATEGORIES = ['Reconstitution', 'Peptide pens', 'Dosing', 'Storage']

/** @type {readonly Tutorial[]} */
export const tutorials = [
  // One recording covers both halves of the workflow, so the design's separate
  // "How to reconstitute a vial" and "Loading and priming a peptide pen" cards
  // are merged into this single featured walkthrough.
  {
    id: 'reconstitute-vial-and-peptide-pen',
    title: 'Reconstituting vials & using peptide pens',
    desc: 'The full walkthrough: reconstituting a vial with bacteriostatic water — down the wall, swirled not shaken — then loading, priming and dosing with a peptide pen.',
    category: 'Reconstitution',
    length: '8:08',
    youtubeId: null,
    isFeatured: true,
  },
  {
    id: 'draw-dose-in-units',
    title: 'Drawing your dose in units',
    desc: 'Reading the syringe scale and matching it to the number from the calculator.',
    category: 'Dosing',
    length: '3:20',
    youtubeId: null,
    isFeatured: false,
  },
  {
    id: 'mix-without-damage',
    title: 'Mixing without damaging the peptide',
    desc: 'Why you swirl instead of shake, and how to tell when a vial is fully dissolved.',
    category: 'Reconstitution',
    length: '2:55',
    youtubeId: null,
    isFeatured: false,
  },
  {
    id: 'choose-syringe-size',
    title: 'Choosing your syringe size',
    desc: 'When a 0.3 ml syringe gives you a more accurate draw than a 1 ml.',
    category: 'Dosing',
    length: '3:41',
    youtubeId: null,
    isFeatured: false,
  },
  {
    id: 'storage-and-sharps',
    title: 'Storage, handling and sharps',
    desc: 'Fridge temperatures, light exposure, expiry windows and safe needle disposal.',
    category: 'Storage',
    length: '5:05',
    youtubeId: null,
    isFeatured: false,
  },
  {
    id: 'change-pen-cartridge',
    title: 'Changing a pen cartridge',
    desc: 'Swapping an empty cartridge and re-priming without wasting product.',
    category: 'Peptide pens',
    length: '3:12',
    youtubeId: null,
    isFeatured: false,
  },
]
