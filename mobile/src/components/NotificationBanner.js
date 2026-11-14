import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRealtime } from '../context/AuthContext';
import { colors, radius, shadow, spacing } from '../theme';
import { Ionicons } from './ui';
import { iconeNotification } from '../notifications';

/** Bandeau affiché en haut de l'écran quand une notification arrive en temps réel. */
export default function NotificationBanner({ onOpen }) {
  const { bandeau, fermerBandeau } = useRealtime();
  const insets = useSafeAreaInsets();
  if (!bandeau) return null;
  const ic = iconeNotification(bandeau.type);
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 8 }]}>
      <Pressable
        onPress={() => {
          fermerBandeau();
          onOpen?.(bandeau);
        }}
        style={styles.banner}
      >
        <View style={[styles.icon, { backgroundColor: ic.bg }]}>
          <Ionicons name={ic.name} size={18} color={ic.fg} />
        </View>
        <View style={{ flex: 1, marginHorizontal: spacing.md }}>
          <Text style={styles.titre} numberOfLines={1}>
            {bandeau.titre}
          </Text>
          <Text style={styles.texte} numberOfLines={2}>
            {bandeau.message}
          </Text>
        </View>
        <Pressable onPress={fermerBandeau} hitSlop={10}>
          <Ionicons name="close" size={18} color={colors.muted} />
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.md, right: spacing.md, zIndex: 100 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadow.raised,
  },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  titre: { fontWeight: '700', color: colors.ink, fontSize: 14 },
  texte: { color: colors.muted, fontSize: 13, marginTop: 1 },
});
