import { create } from 'zustand';

/**
 * `off`    -- dark screen, tap to wake
 * `locked` -- lock screen, swipe up to unlock
 * `home`   -- app grid
 */
export type PhoneState = 'off' | 'locked' | 'home';

interface PhoneStore {
  state: PhoneState;
  /** Which app is open over the home screen, if any. */
  app: string | null;
  /**
   * Design-space centre of the icon the open app grew from. Deliberately not
   * cleared on close, so the closing animation shrinks back to the same icon.
   */
  appOrigin: [number, number];
  openApp: (name: string, origin: [number, number]) => void;
  closeApp: () => void;
  /** Index into NOTES of the note being read, or null for the list. */
  note: number | null;
  openNote: (index: number) => void;
  closeNote: () => void;
  wake: () => void;
  unlock: () => void;
  /** Back to the lock screen from the home screen, as the Lock app does. */
  relock: () => void;
  lock: () => void;
}

export const usePhone = create<PhoneStore>((set) => ({
  state: 'off',
  app: null,
  appOrigin: [0, 0],
  openApp: (name, origin) =>
    set((s) => (s.state === 'home' ? { app: name, appOrigin: origin } : s)),
  closeApp: () => set({ app: null, note: null }),
  note: null,
  openNote: (index) => set({ note: index }),
  closeNote: () => set({ note: null }),
  wake: () => set((s) => (s.state === 'off' ? { state: 'locked' } : s)),
  unlock: () => set((s) => (s.state === 'locked' ? { state: 'home' } : s)),
  relock: () => set((s) => (s.state === 'home' ? { state: 'locked', app: null } : s)),
  lock: () => set((s) => (s.state === 'off' ? s : { state: 'off', app: null })),
}));

/**
 * Live animation values, module-level so both PhoneUI (which drives them) and
 * the screens (which react to them) can share without prop-drilling a ref.
 */
export const phoneValues = { lift: 0 };

/** How far the lock screen travels on unlock, as a fraction of screen height. */
export const LIFT_TRAVEL = 0.45;

/** The design grid everything is laid out in: iPhone 14 Pro points. */
export const DESIGN = { width: 390, height: 844 } as const;

/** App icon edge length, in design points. Shared so the open animation can
 *  start an app at exactly its icon's size. */
export const ICON_SIZE = 66;

/** Z spacing between UI layers, in design px, to keep coplanar fills from z-fighting. */
export const LAYER = 1.5;

export interface AppIcon {
  name: string;
  /** Tile background, shown only if an app has no artwork yet. */
  color: string;
  /** Supplied artwork. When present it replaces the drawn glyph entirely. */
  icon?: string;
}

export const APPS: AppIcon[] = [
  { name: 'Contacts', color: '#f4f4f7', icon: '/icons/contacts.webp' },
  { name: 'Projects', color: '#2f6df6', icon: '/icons/projects.webp' },
  { name: 'Experience', color: '#e8a13a', icon: '/icons/experience.webp' },
  { name: 'Skills', color: '#34b56a', icon: '/icons/skills.webp' },
  { name: 'Settings', color: '#8e8e93', icon: '/icons/settings.webp' },
  { name: 'Lock', color: '#2c2c2e', icon: '/icons/lock.webp' },
  { name: 'Photos', color: '#fbfbfd', icon: '/icons/photos.webp' },
  { name: 'Notes', color: '#fcfcfa', icon: '/icons/notes.webp' },
];

/** The four in the dock, which carry no labels. */
export const DOCK: AppIcon[] = [
  { name: 'Phone', color: '#34c759', icon: '/icons/phone.webp' },
  { name: 'Messages', color: '#3ad35e', icon: '/icons/messages.webp' },
  { name: 'Music', color: '#fa2d48', icon: '/icons/music.webp' },
  { name: 'Camera', color: '#8e8e93', icon: '/icons/camera.webp' },
];

/** Content for the Notes app. */
export const NOTES = [
  {
    title: 'About me',
    date: '1 September 2026',
    /** Abbreviated for the list row, where it shares a line with the snippet. */
    short: '1 Sept',
    snippet: 'Front-end engineer in New Delhi, six years in.',
    body: `I am Ashu Panwar, a front-end engineer based in New Delhi.

Six years in, mostly React and TypeScript, mostly on products that real people depend on rather than demos. I started at HCL on a portal serving 200,000 employees, spent time at UiPath building automation tooling for Fortune 500 teams, and now work at THB on healthcare software.

I care about the parts users never see credited: how fast a page becomes usable, whether an interface survives a bad network, whether the person on the other end can finish what they came to do.`,
  },
  {
    title: 'What I build',
    date: '28 August 2026',
    /** Abbreviated for the list row, where it shares a line with the snippet. */
    short: '28 Aug',
    snippet: 'Patient apps, CRMs and dashboards for hospitals.',
    body: `Medanta's patient-facing web app, live today, where people book doctor appointments, lab tests and emergency services.

CRM systems for Medanta, Max and Svass hospitals, used daily by staff who cannot afford a slow tool.

An outbreak monitoring dashboard for GSK, turning a lot of noisy data into something a human can act on quickly.

Before healthcare: e-commerce builds, a template-driven website builder, and inventory CRMs.`,
  },
  {
    title: 'Currently learning',
    date: '19 August 2026',
    /** Abbreviated for the list row, where it shares a line with the snippet. */
    short: '19 Aug',
    snippet: 'Three.js, shaders and spatial interfaces.',
    body: `Three.js and react-three-fiber, which is what this phone you are holding is made of.

GLSL shaders, mostly to understand what the abstraction is hiding.

Spatial interface design: what happens to familiar UI patterns when they stop being flat, and which of them stop working entirely.`,
  },
  {
    title: 'Say hello',
    date: '4 August 2026',
    /** Abbreviated for the list row, where it shares a line with the snippet. */
    short: '4 Aug',
    snippet: 'ashupanwar2nd@gmail.com',
    body: `ashupanwar2nd@gmail.com

New Delhi, India

Open to interesting front-end work, particularly anything where the interface itself is the hard part.`,
  },
] as const;

/** Every distinct artwork path, for a single batched texture load. */
export const ICON_URLS = [...APPS, ...DOCK]
  .map((app) => app.icon)
  .filter((icon): icon is string => Boolean(icon));
