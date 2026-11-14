// Design system UniRide — couleurs ISET (bleu royal + jaune), une seule source de vérité.
export const colors = {
  primary: '#0D47A1',
  primaryDark: '#0A3578',
  primarySoft: '#E8F0FC',
  accent: '#FACC15',
  accentSoft: '#FEF9C3',
  accentInk: '#713F12',

  background: '#F4F6FA',
  card: '#FFFFFF',
  ink: '#0F172A',
  text: '#1E293B',
  muted: '#64748B',
  faint: '#94A3B8',
  border: '#E2E8F0',
  borderSoft: '#EEF2F7',
  input: '#F1F5F9',

  success: '#15803D',
  successSoft: '#DCFCE7',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  info: '#0369A1',
  infoSoft: '#E0F2FE',

  white: '#FFFFFF',
  overlay: 'rgba(15, 23, 42, 0.45)',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

export const radius = { sm: 8, md: 12, lg: 16, xl: 22, full: 999 };

export const font = {
  h1: { fontSize: 26, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  h3: { fontSize: 17, fontWeight: '700', color: colors.ink },
  body: { fontSize: 15, color: colors.text, lineHeight: 21 },
  small: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  caption: { fontSize: 12, color: colors.muted },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  overline: { fontSize: 11, fontWeight: '700', color: colors.muted, letterSpacing: 0.8, textTransform: 'uppercase' },
};

export const shadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  raised: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
};

/** Couleur d'un score de compatibilité. */
export function scoreTone(score) {
  if (score >= 80) return { bg: colors.successSoft, fg: colors.success };
  if (score >= 60) return { bg: colors.accentSoft, fg: colors.accentInk };
  return { bg: colors.input, fg: colors.muted };
}
