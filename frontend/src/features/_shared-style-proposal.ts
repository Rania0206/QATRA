/**
 * QATRA design tokens — PROPOSAL (A-15). Editorial & minimal, projector-first.
 *
 * Used for now only by features/batches and features/compatibility, through the CSS variables
 * and helper classes in features/_qatra-editorial.css (scoped under `.q-screen`).
 * If the team adopts them, move them to the global theme (index.css @theme) and the Shell.
 */

export const colors = {
  cream: "#F4EDE3", // page background
  paper: "#FBF8F3", // cards, drawers, table rows
  paperAlt: "#F7F1E8", // zebra rows, muted (blocked) cards
  hover: "#EFE5D6", // hover / pressed surfaces
  ink: "#141414", // text, 1px borders, solid buttons
  ink2: "#4A4A4A", // secondary text (no light grey: projector)
  accent: "#E4572E", // the ONE accent: highlights, focus, latest batch. White text only at ≥ 18 px bold.
  ok: "#2E7D4F", // ✅ compatible / valid / compliant (white text)
  warn: "#D98E04", // ⚠️ conditional / expired (ink text: white fails contrast on this orange)
  bad: "#C0392B", // ⛔ blocked / missing / non-compliant (white text)
} as const;

export const fonts = {
  display: "'Archivo', system-ui, sans-serif", // headings, weight 800; section titles UPPERCASE
  body: "'Inter', system-ui, sans-serif", // body text, weights 400 / 600
  mono: "'IBM Plex Mono', ui-monospace, monospace", // data, IDs, dates, m³, labels; weights 400 / 600
} as const;

/** px. Body never below 16 on screens shown to the jury. */
export const fontSize = {
  label: 15, // mono uppercase labels / table headers
  body: 16,
  lead: 18,
  h2: 28, // screen titles
  h3: 22, // section titles (uppercase)
  hero: 64, // key figures ("257 HA"); 48 on small screens
} as const;

export const shape = {
  border: `1px solid ${colors.ink}`,
  divider: `1px dashed ${colors.ink}`, // between sections, like a printed menu
  radius: 2, // square-ish corners; no heavy shadows
} as const;

export const motion = {
  fast: "150ms ease-out", // hover, press
  skeleton: "1.2s ease-in-out infinite", // shimmer; disabled with prefers-reduced-motion
} as const;
