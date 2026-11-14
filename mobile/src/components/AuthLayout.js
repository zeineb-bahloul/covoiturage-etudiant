import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from './ui';
import { colors, radius, spacing } from '../theme';

/** Mise en page commune aux écrans de connexion / inscription. */
export default function AuthLayout({ titre, sousTitre, onBack, children, pied }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.primary }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={[styles.haut, { paddingTop: insets.top + spacing.md }]}>
          {onBack ? (
            <Pressable onPress={onBack} style={styles.retour} hitSlop={8} accessibilityLabel="Retour">
              <Ionicons name="chevron-back" size={22} color={colors.white} />
            </Pressable>
          ) : null}
          <View style={styles.logo}>
            <Ionicons name="car-sport" size={26} color={colors.primary} />
          </View>
          <Text style={styles.titre}>{titre}</Text>
          {sousTitre ? <Text style={styles.sousTitre}>{sousTitre}</Text> : null}
        </View>
        <View style={[styles.feuille, { paddingBottom: insets.bottom + spacing.xl }]}>
          {children}
          {pied ? <View style={{ marginTop: 'auto', paddingTop: spacing.xl }}>{pied}</View> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  haut: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  retour: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  logo: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  titre: { fontSize: 28, fontWeight: '800', color: colors.white, letterSpacing: -0.5 },
  sousTitre: { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 4, lineHeight: 21 },
  feuille: {
    flex: 1,
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl + 6,
    borderTopRightRadius: radius.xl + 6,
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },
});
