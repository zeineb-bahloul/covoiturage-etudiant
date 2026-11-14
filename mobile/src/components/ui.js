import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, scoreTone, shadow, spacing } from '../theme';

export { Ionicons };

/* ───────────── Mise en page ───────────── */

/** Écran standard : en-tête optionnel, contenu défilant, pied fixe optionnel. */
export function Screen({
  header,
  children,
  footer,
  scroll = true,
  refreshing = false,
  onRefresh,
  contentStyle,
  keyboard = false,
  background = colors.background,
  bottomInset = true,
}) {
  const safe = useSafeAreaInsets();
  const insets = bottomInset ? safe : { ...safe, bottom: 0 };
  const corps = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.screenContent, { paddingBottom: footer ? spacing.lg : insets.bottom + 32 }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} /> : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
  );

  const contenu = (
    <View style={{ flex: 1, backgroundColor: background }}>
      {header}
      {corps}
      {footer ? <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>{footer}</View> : null}
    </View>
  );

  return keyboard ? (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {contenu}
    </KeyboardAvoidingView>
  ) : (
    contenu
  );
}

/** En-tête d'écran. variant « primary » = bandeau bleu, « light » = blanc. */
export function Header({ title, subtitle, onBack, right, variant = 'light', children }) {
  const insets = useSafeAreaInsets();
  const primary = variant === 'primary';
  const fg = primary ? colors.white : colors.ink;
  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + spacing.sm },
        primary ? styles.headerPrimary : styles.headerLight,
      ]}
    >
      <View style={styles.headerRow}>
        {onBack ? (
          <IconButton icon="chevron-back" onPress={onBack} tone={primary ? 'onPrimary' : 'plain'} label="Retour" />
        ) : null}
        <View style={{ flex: 1, marginLeft: onBack ? spacing.sm : 0 }}>
          <Text style={[font.h3, { color: fg, fontSize: 18 }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[font.small, { color: primary ? 'rgba(255,255,255,0.8)' : colors.muted }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ? <View style={{ marginLeft: spacing.sm }}>{right}</View> : null}
      </View>
      {children}
    </View>
  );
}

export function IconButton({ icon, onPress, tone = 'plain', size = 22, badge, label, disabled }) {
  const tones = {
    plain: { bg: colors.input, fg: colors.ink },
    onPrimary: { bg: 'rgba(255,255,255,0.16)', fg: colors.white },
    primary: { bg: colors.primary, fg: colors.white },
    accent: { bg: colors.accent, fg: colors.ink },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  };
  const t = tones[tone] || tones.plain;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [styles.iconBtn, { backgroundColor: t.bg, opacity: pressed || disabled ? 0.6 : 1 }]}
    >
      <Ionicons name={icon} size={size} color={t.fg} />
      {badge ? (
        <View style={styles.iconBadge}>
          <Text style={styles.iconBadgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function Card({ children, style, onPress, padded = true }) {
  const contenu = [styles.card, padded && { padding: spacing.lg }, style];
  if (!onPress) return <View style={contenu}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [...contenu, pressed && { opacity: 0.85 }]}>
      {children}
    </Pressable>
  );
}

export function SectionTitle({ children, action, onAction, style }) {
  return (
    <View style={[styles.sectionRow, style]}>
      <Text style={font.h3}>{children}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const Divider = ({ style }) => <View style={[styles.divider, style]} />;

export function Row({ children, style, gap = spacing.sm }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

/* ───────────── Actions ───────────── */

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, size = 'lg', style, full = true }) {
  const v = {
    primary: { bg: colors.primary, fg: colors.white },
    accent: { bg: colors.accent, fg: colors.ink },
    secondary: { bg: colors.primarySoft, fg: colors.primary },
    ghost: { bg: 'transparent', fg: colors.primary },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    success: { bg: colors.success, fg: colors.white },
    outline: { bg: colors.card, fg: colors.ink, border: colors.border },
    onPrimary: { bg: 'transparent', fg: colors.white, border: 'rgba(255,255,255,0.45)' },
  }[variant];
  const petit = size === 'sm';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: v.bg,
          borderColor: v.border || v.bg,
          paddingVertical: petit ? 9 : 14,
          paddingHorizontal: petit ? 14 : 18,
          alignSelf: full ? 'stretch' : 'flex-start',
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={petit ? 16 : 19} color={v.fg} style={{ marginRight: 8 }} /> : null}
          <Text style={{ color: v.fg, fontWeight: '700', fontSize: petit ? 14 : 16 }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

/* ───────────── Formulaires ───────────── */

export function Field({ label, hint, error, children, style }) {
  return (
    <View style={[{ marginBottom: spacing.lg }, style]}>
      {label ? <Text style={[font.label, { marginBottom: 6 }]}>{label}</Text> : null}
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function Input({ label, hint, error, icon, secure, style, inputStyle, right, multiline, ...props }) {
  const [cache, setCache] = useState(true);
  const [focus, setFocus] = useState(false);
  return (
    <Field label={label} hint={hint} error={error} style={style}>
      <View
        style={[
          styles.inputBox,
          multiline && { alignItems: 'flex-start', paddingVertical: 10 },
          focus && { borderColor: colors.primary, backgroundColor: colors.card },
          error && { borderColor: colors.danger },
        ]}
      >
        {icon ? <Ionicons name={icon} size={19} color={focus ? colors.primary : colors.faint} style={{ marginRight: 10, marginTop: multiline ? 2 : 0 }} /> : null}
        <TextInput
          style={[styles.input, multiline && { minHeight: 80, textAlignVertical: 'top', paddingVertical: 0 }, inputStyle]}
          placeholderTextColor={colors.faint}
          secureTextEntry={secure && cache}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          multiline={multiline}
          {...props}
        />
        {secure ? (
          <Pressable onPress={() => setCache(!cache)} hitSlop={8}>
            <Ionicons name={cache ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.muted} />
          </Pressable>
        ) : null}
        {right}
      </View>
    </Field>
  );
}

export function Chip({ label, selected, onPress, icon, style }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && { backgroundColor: colors.primary, borderColor: colors.primary },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={15} color={selected ? colors.white : colors.muted} style={{ marginRight: 6 }} /> : null}
      <Text style={[styles.chipText, selected && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

/** Onglets segmentés (ex : Passager / Conducteur). */
export function Segmented({ options, value, onChange, style }) {
  return (
    <View style={[styles.segmented, style]}>
      {options.map((o) => {
        const actif = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segment, actif && styles.segmentActive]}>
            <Text style={[styles.segmentText, actif && { color: colors.primary }]} numberOfLines={1}>
              {o.label}
              {o.count ? ` (${o.count})` : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stepper({ value, onChange, min = 1, max = 8 }) {
  return (
    <Row gap={spacing.md}>
      <IconButton icon="remove" onPress={() => onChange(Math.max(min, value - 1))} disabled={value <= min} />
      <Text style={[font.h2, { minWidth: 26, textAlign: 'center' }]}>{value}</Text>
      <IconButton icon="add" onPress={() => onChange(Math.min(max, value + 1))} disabled={value >= max} tone="primary" />
    </Row>
  );
}

export function Toggle({ label, description, value, onChange, icon }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={styles.toggleRow}>
      {icon ? (
        <View style={styles.listIcon}>
          <Ionicons name={icon} size={19} color={colors.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={font.label}>{label}</Text>
        {description ? <Text style={font.caption}>{description}</Text> : null}
      </View>
      <View style={[styles.switchTrack, value && { backgroundColor: colors.primary }]}>
        <View style={[styles.switchThumb, value && { transform: [{ translateX: 18 }] }]} />
      </View>
    </Pressable>
  );
}

/* ───────────── Affichage ───────────── */

export function Avatar({ uri, nom, size = 44, style }) {
  const initiales = (nom || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase())
    .join('');
  if (uri) return <Image source={{ uri }} style={[{ width: size, height: size, borderRadius: size / 2 }, style]} />;
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }, style]}>
      <Text style={{ color: colors.primary, fontWeight: '800', fontSize: size * 0.38 }}>{initiales}</Text>
    </View>
  );
}

export function Badge({ label, tone = 'neutral', icon, style }) {
  const t = {
    neutral: [colors.input, colors.muted],
    primary: [colors.primarySoft, colors.primary],
    success: [colors.successSoft, colors.success],
    warning: [colors.warningSoft, colors.warning],
    danger: [colors.dangerSoft, colors.danger],
    accent: [colors.accentSoft, colors.accentInk],
    info: [colors.infoSoft, colors.info],
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t[0] }, style]}>
      {icon ? <Ionicons name={icon} size={12} color={t[1]} style={{ marginRight: 4 }} /> : null}
      <Text style={[styles.badgeText, { color: t[1] }]}>{label}</Text>
    </View>
  );
}

export function ScoreBadge({ score, large }) {
  if (typeof score !== 'number') return null;
  const t = scoreTone(score);
  return (
    <View style={[styles.score, { backgroundColor: t.bg }, large && { paddingHorizontal: 12, paddingVertical: 6 }]}>
      <Ionicons name="sparkles" size={large ? 15 : 12} color={t.fg} style={{ marginRight: 4 }} />
      <Text style={{ color: t.fg, fontWeight: '800', fontSize: large ? 15 : 12 }}>{score} %</Text>
    </View>
  );
}

export function Stars({ value = 0, size = 14, count }) {
  return (
    <Row gap={3}>
      <Ionicons name="star" size={size} color="#F59E0B" />
      <Text style={{ fontSize: size - 1, fontWeight: '700', color: colors.text }}>
        {value > 0 ? value.toFixed(1).replace('.', ',') : 'Nouveau'}
      </Text>
      {count ? <Text style={{ fontSize: size - 2, color: colors.muted }}>({count})</Text> : null}
    </Row>
  );
}

/** Ligne de trajet : départ ● — ● arrivée avec heures. */
export function RouteLine({ depart, arrivee, heureDepart, heureArrivee, compact }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      <View style={{ alignItems: 'center', width: 14, paddingTop: 5 }}>
        <View style={[styles.dot, { borderColor: colors.primary }]} />
        <View style={styles.dotLine} />
        <View style={[styles.dot, { backgroundColor: colors.accent, borderColor: colors.accent }]} />
      </View>
      <View style={{ flex: 1, marginLeft: spacing.sm, gap: compact ? 10 : 14 }}>
        <View>
          {heureDepart ? <Text style={styles.routeTime}>{heureDepart}</Text> : null}
          <Text style={styles.routePlace} numberOfLines={compact ? 1 : 2}>
            {depart}
          </Text>
        </View>
        <View>
          {heureArrivee ? <Text style={styles.routeTime}>{heureArrivee}</Text> : null}
          <Text style={styles.routePlace} numberOfLines={compact ? 1 : 2}>
            {arrivee}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function ListItem({ icon, iconTone = 'primary', title, subtitle, onPress, right, danger }) {
  const tones = {
    primary: [colors.primarySoft, colors.primary],
    accent: [colors.accentSoft, colors.accentInk],
    success: [colors.successSoft, colors.success],
    danger: [colors.dangerSoft, colors.danger],
    info: [colors.infoSoft, colors.info],
  };
  const t = danger ? tones.danger : tones[iconTone];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.listItem, pressed && { backgroundColor: colors.input }]}>
      {icon ? (
        <View style={[styles.listIcon, { backgroundColor: t[0] }]}>
          <Ionicons name={icon} size={19} color={t[1]} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[font.label, { fontSize: 15 }, danger && { color: colors.danger }]}>{title}</Text>
        {subtitle ? (
          <Text style={font.caption} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right !== undefined ? right : onPress ? <Ionicons name="chevron-forward" size={18} color={colors.faint} /> : null}
    </Pressable>
  );
}

export function StatTile({ icon, value, label, tone = 'primary', style }) {
  const t = { primary: [colors.primarySoft, colors.primary], success: [colors.successSoft, colors.success], accent: [colors.accentSoft, colors.accentInk], info: [colors.infoSoft, colors.info] }[tone];
  return (
    <View style={[styles.card, styles.statTile, style]}>
      <View style={[styles.listIcon, { backgroundColor: t[0], marginRight: 0, marginBottom: 8 }]}>
        <Ionicons name={icon} size={18} color={t[1]} />
      </View>
      <Text style={[font.h2, { fontSize: 19 }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={font.caption} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function ProgressBar({ value, color = colors.primary, style }) {
  return (
    <View style={[styles.progressTrack, style]}>
      <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }]} />
    </View>
  );
}

export function Notice({ icon = 'information-circle-outline', tone = 'info', title, text, action, onAction, style }) {
  const t = { info: [colors.infoSoft, colors.info], warning: [colors.warningSoft, colors.warning], success: [colors.successSoft, colors.success], accent: [colors.accentSoft, colors.accentInk], danger: [colors.dangerSoft, colors.danger] }[tone];
  return (
    <View style={[styles.notice, { backgroundColor: t[0] }, style]}>
      <Ionicons name={icon} size={20} color={t[1]} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, marginLeft: spacing.sm }}>
        {title ? <Text style={{ fontWeight: '700', color: t[1], marginBottom: 2 }}>{title}</Text> : null}
        {text ? <Text style={{ color: colors.text, fontSize: 13, lineHeight: 18 }}>{text}</Text> : null}
        {action ? (
          <Pressable onPress={onAction} hitSlop={6} style={{ marginTop: 6 }}>
            <Text style={{ color: t[1], fontWeight: '800' }}>{action} →</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function EmptyState({ icon = 'file-tray-outline', title, text, action, onAction }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <Text style={[font.h3, { textAlign: 'center' }]}>{title}</Text>
      {text ? <Text style={[font.small, { textAlign: 'center', marginTop: 6 }]}>{text}</Text> : null}
      {action ? <Button title={action} onPress={onAction} variant="secondary" full={false} style={{ marginTop: spacing.lg }} /> : null}
    </View>
  );
}

export function Loader({ text }) {
  return (
    <View style={styles.loader}>
      <ActivityIndicator size="large" color={colors.primary} />
      {text ? <Text style={[font.small, { marginTop: spacing.md }]}>{text}</Text> : null}
    </View>
  );
}

export function ErrorState({ text, onRetry }) {
  return <EmptyState icon="cloud-offline-outline" title="Oups" text={text} action={onRetry ? 'Réessayer' : null} onAction={onRetry} />;
}

const styles = StyleSheet.create({
  screenContent: { padding: spacing.xl, gap: 0 },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  headerPrimary: { backgroundColor: colors.primary },
  headerLight: { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  headerRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  iconBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.white,
  },
  iconBadgeText: { color: colors.white, fontSize: 9, fontWeight: '800' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadow.card,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm, marginBottom: spacing.md },
  sectionAction: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  divider: { height: 1, backgroundColor: colors.borderSoft, marginVertical: spacing.md },
  button: { borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  fieldError: { color: colors.danger, fontSize: 12, marginTop: 5 },
  fieldHint: { color: colors.muted, fontSize: 12, marginTop: 5 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.input,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.input,
    paddingHorizontal: 14,
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.ink },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.text },
  segmented: { flexDirection: 'row', backgroundColor: colors.input, borderRadius: radius.md, padding: 4 },
  segment: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: radius.sm },
  segmentActive: { backgroundColor: colors.card, ...shadow.card },
  segmentText: { fontWeight: '700', color: colors.muted, fontSize: 14 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  switchTrack: { width: 44, height: 26, borderRadius: 13, backgroundColor: colors.border, padding: 3 },
  switchThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.white, ...shadow.card },
  avatar: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.full },
  badgeText: { fontSize: 12, fontWeight: '700' },
  score: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.full },
  dot: { width: 11, height: 11, borderRadius: 6, borderWidth: 2.5, backgroundColor: colors.white },
  dotLine: { width: 2, flex: 1, backgroundColor: colors.border, marginVertical: 3, minHeight: 14 },
  routeTime: { fontSize: 15, fontWeight: '800', color: colors.ink },
  routePlace: { fontSize: 13, color: colors.muted, marginTop: 1 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: spacing.lg, gap: 0 },
  listIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md, backgroundColor: colors.primarySoft },
  statTile: { flex: 1, padding: spacing.md, marginBottom: 0 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.input, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  notice: { flexDirection: 'row', padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: spacing.xl },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, backgroundColor: colors.background },
});
