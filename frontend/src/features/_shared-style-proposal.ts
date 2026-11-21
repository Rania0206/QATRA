/**
 * QATRA design tokens — PROPOSAL (A-15). Minimal & professional, projector-first.
 *
 * Used for now only by features/batches and features/compatibility, through the CSS variables
 * and helper classes in features/_qatra-editorial.css (scoped under `.q-screen`).
 * If the team adopts them, move them to the global theme (index.css @theme) and the Shell.
 *
 * Principles: one font, sentence case, light surfaces, thin grey borders, colour only for status.
 */

export const colors = {
  page: "#F8FAFC", // page background
  surface: "#FFFFFF", // cards, drawers, table
  surfaceAlt: "#F9FAFB", // zebra rows, muted (blocked) cards
  hover: "#F3F4F6",
  line: "#E5E7EB", // 1px borders and dividers
  ink: "#111827", // text, primary buttons
  ink2: "#4B5563", // secondary text (stays dark enough for a projector)
  accent: "#0F766E", // teal, same family as the shell header; focus rings, latest-batch marker
  status: {
    ok: { text: "#166534", bg: "#F0FDF4", border: "#BBF7D0", dot: "#16A34A" }, // compatible / valid / compliant
    warn: { text: "#92400E", bg: "#FFFBEB", border: "#FDE68A", dot: "#D97706" }, // conditional / expired
    bad: { text: "#991B1B", bg: "#FEF2F2", border: "#FECACA", dot: "#DC2626" }, // blocked / missing / non-compliant
    neutral: { text: "#374151", bg: "#F3F4F6", border: "#E5E7EB", dot: "#6B7280" }, // analysis invalid
  },
} as const;

export const font = {
  family: "'Inter', system-ui, sans-serif", // everything; numbers use tabular figures
  mono: "ui-monospace, 'SF Mono', Consolas, monospace", // batch IDs only
  weights: [400, 500, 600], // no 700/800
} as const;

/** px. Body never below 16 on screens shown to the jury. */
export const fontSize = {
  label: 15,
  body: 16,
  title: 18, // section titles
  h2: 24, // screen titles
  figure: 30, // key figures in the stat strip
} as const;

export const shape = {
  radius: 8, // cards; 6 for badges and inputs
  border: `1px solid ${colors.line}`,
  shadow: "0 1px 2px rgb(17 24 39 / 0.04)",
} as const;

export const motion = {
  fast: "150ms ease-out", // hover, press
  skeleton: "1.2s ease-in-out infinite", // disabled with prefers-reduced-motion
} as const;
