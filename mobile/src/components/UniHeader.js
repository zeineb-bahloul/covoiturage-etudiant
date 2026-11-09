import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors, shadows } from '../theme';

export default function UniHeader({
  title,
  titre,
  subtitle,
  sousTitre,
  navigation,
  onBack,
  showBack = true,
  rightComponent,
  variant = 'primary',
}) {
  const displayTitle = title || titre || '';
  const displaySubtitle = subtitle || sousTitre || '';
  const handleBack = onBack || (navigation ? () => navigation.goBack() : null);
  const isPrimary = variant === 'primary';

  return (
    <View style={[styles.header, isPrimary ? styles.headerPrimary : styles.headerLight]}>
      <View style={styles.topRow}>
        {showBack && handleBack ? (
          <TouchableOpacity
            style={[styles.backButton, isPrimary ? styles.backButtonPrimary : styles.backButtonLight]}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Text style={[styles.backArrow, isPrimary ? styles.backArrowPrimary : styles.backArrowLight]}>
              {'‹'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.logoBadge}>
            <Text style={styles.logoLetter}>U</Text>
          </View>
        )}

        <View style={styles.titleContainer}>
          <Text
            style={[styles.title, isPrimary ? styles.titlePrimary : styles.titleLight]}
            numberOfLines={1}
          >
            {displayTitle}
          </Text>
          {displaySubtitle ? (
            <Text
              style={[styles.subtitle, isPrimary ? styles.subtitlePrimary : styles.subtitleLight]}
              numberOfLines={1}
            >
              {displaySubtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.rightSlot}>{rightComponent || <View style={{ width: 36 }} />}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 16,
    paddingHorizontal: 18,
    ...shadows.card,
  },
  headerPrimary: {
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerLight: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonPrimary: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  backButtonLight: {
    backgroundColor: colors.background,
  },
  backArrow: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 28,
  },
  backArrowPrimary: {
    color: colors.white,
  },
  backArrowLight: {
    color: colors.text,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoLetter: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.navy,
  },
  titleContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  titlePrimary: {
    color: colors.white,
  },
  titleLight: {
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  subtitlePrimary: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  subtitleLight: {
    color: colors.textMuted,
  },
  rightSlot: {
    minWidth: 38,
    alignItems: 'flex-end',
  },
});
