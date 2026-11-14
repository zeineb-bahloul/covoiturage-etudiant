import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Button, Ionicons } from '../components/ui';
import { colors, radius, spacing } from '../theme';

const ATOUTS = [
  { icone: 'sparkles', titre: 'Suggestions intelligentes', texte: "Des conducteurs compatibles avec votre emploi du temps, notés sur 100." },
  { icone: 'shield-checkmark', titre: 'Entre étudiants de confiance', texte: 'Profils ISET, notes mutuelles et badges.' },
  { icone: 'leaf', titre: 'Économique et écologique', texte: 'Partagez les frais et suivez le CO₂ évité.' },
];

export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl }]}>
      <StatusBar style="light" />
      <View style={styles.logo}>
        <Ionicons name="car-sport" size={40} color={colors.primary} />
      </View>
      <Text style={styles.marque}>UniRide</Text>
      <Text style={styles.slogan}>Le covoiturage des étudiants de l'ISET Nabeul</Text>

      <View style={styles.atouts}>
        {ATOUTS.map((a) => (
          <View key={a.titre} style={styles.atout}>
            <View style={styles.atoutIcone}>
              <Ionicons name={a.icone} size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.atoutTitre}>{a.titre}</Text>
              <Text style={styles.atoutTexte}>{a.texte}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={{ gap: spacing.md }}>
        <Button title="Créer un compte" variant="accent" onPress={() => navigation.navigate('Register')} />
        <Button title="J'ai déjà un compte" variant="onPrimary" onPress={() => navigation.navigate('Login')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary, paddingHorizontal: spacing.xl },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  marque: { fontSize: 34, fontWeight: '900', color: colors.white, textAlign: 'center', marginTop: spacing.lg, letterSpacing: -0.5 },
  slogan: { fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 4 },
  atouts: { flex: 1, justifyContent: 'center', gap: spacing.lg },
  atout: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.lg, padding: spacing.lg },
  atoutIcone: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(250,204,21,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  atoutTitre: { color: colors.white, fontWeight: '700', fontSize: 15 },
  atoutTexte: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2, lineHeight: 18 },
});
