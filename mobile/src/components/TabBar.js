import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, shadow } from '../theme';
import { Ionicons } from './ui';

export const ONGLETS = [
  { cle: 'accueil', label: 'Accueil', icone: 'home' },
  { cle: 'recherche', label: 'Rechercher', icone: 'search' },
  { cle: 'trajets', label: 'Trajets', icone: 'car' },
  { cle: 'messages', label: 'Messages', icone: 'chatbubbles' },
  { cle: 'profil', label: 'Profil', icone: 'person' },
];

export default function TabBar({ actif, onChange, badges = {} }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {ONGLETS.map((o) => {
        const sel = o.cle === actif;
        const badge = badges[o.cle];
        return (
          <Pressable key={o.cle} onPress={() => onChange(o.cle)} style={styles.item} accessibilityRole="tab" accessibilityState={{ selected: sel }}>
            <View style={[styles.pill, sel && { backgroundColor: colors.primarySoft }]}>
              <Ionicons name={sel ? o.icone : `${o.icone}-outline`} size={22} color={sel ? colors.primary : colors.muted} />
              {badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, sel && { color: colors.primary, fontWeight: '700' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    ...shadow.raised,
  },
  item: { flex: 1, alignItems: 'center' },
  pill: { width: 52, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, color: colors.muted, marginTop: 2, fontWeight: '500' },
  badge: {
    position: 'absolute',
    top: -3,
    right: 6,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: colors.white,
  },
  badgeText: { color: colors.white, fontSize: 9, fontWeight: '800' },
});
