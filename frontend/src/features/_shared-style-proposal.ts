/**
 * QATRA design tokens — PROPOSAL (A-15). Minimal & professional, projector-first.
 *
 * Used for now only by features/batches and features/compatibility, through the CSS variables
 * and helper classes in features/_qatra-editorial.css (scoped under `.q-screen`).
 * If the team adopts them, move them to the global theme (index.css @theme) and the Shell.
 *
 * Principles: light serif titles, sans body, small mono labels, sentence case,
 * off-white surfaces, thin warm-grey lines, ONE accent (olive), colour only for status.
 */

export const colors = {
  page: "#FBF8F3", // warm off-white page
  surface: "#FFFFFF", // cards, drawers, table
  surfaceAlt: "#F6F2EA", // zebra rows, muted (blocked) cards
  hover: "#F1ECE3",
  line: "#E2DBCF", // 1px borders and dividers
  ink: "#1C1C1A", // text, active segmented control, outlined buttons
  ink2: "#55524C", // secondary text (still dark enough for a projector)
  accent: "#6B8547", // muted olive: focus rings, latest-batch marker, selected card
  status: {
    ok: "#4F6B2F", // compatible / valid / compliant
    warn: "#9A6212", // conditional / expired
    bad: "#9B2C2C", // blocked / missing / non-compliant
    neutral: "#55524C", // analysis invalid
  }, // shown as thin outlined pills with a dot, never as filled blocks
} as const;

export const fonts = {
  display: "'Cormorant Garamond', Georgia, serif", // titles + key figures, weight 500, lining numerals
  body: "'Inter', system-ui, sans-serif", // body text, weights 400 / 500
  mono: "'IBM Plex Mono', ui-monospace, monospace", // small labels, IDs, buttons, weight 400
} as const;

/** px. Body never below 16 on screens shown to the jury. */
export const fontSize = {
  label: 15, // mono labels, table headers, pills
  body: 16,
  section: 26, // serif section titles
  h2: 48, // serif screen titles (36 on small screens)
  figure: 48, // serif key figures in the stat strip
} as const;

export const shape = {
  radius: 2, // square-ish corners everywhere
  border: `1px solid ${colors.line}`,
  button: `1px solid ${colors.ink}`, // outlined button; fills ink on hover
} as const;

export const motion = {
  fast: "150ms ease-out", // hover, press
  skeleton: "1.2s ease-in-out infinite", // disabled with prefers-reduced-motion
} as const;
