import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import api from '../api';
import { Badge, Card, ErrorState, Header, Ionicons, Loader, Row, Screen, SectionTitle, StatTile, Stars } from '../components/ui';
import { useDonnees } from '../hooks';
import { colors, font, radius, spacing } from '../theme';
import { nombre, prix } from '../utils';

/** Statistiques personnelles (US16) et badges (US17). */
export default function StatsScreen({ navigation }) {
  const { data: s, chargement, erreur, rafraichir, rafraichissement, reessayer } = useDonnees(() => api.get('/stats/me').then((r) => r.data));

  if (chargement) return <Loader />;
  if (erreur) return <ErrorState text={erreur} onRetry={reessayer} />;

  const debloques = s.badges.filter((b) => b.debloque).length;
  const arbres = s.co2Economise / 25; // un arbre absorbe ≈ 25 kg de CO₂ par an

  return (
    <Screen header={<Header title="Statistiques et badges" onBack={() => navigation.goBack()} />} onRefresh={rafraichir} refreshing={rafraichissement}>
      <Card style={styles.hero}>
        <Text style={[font.overline, { color: 'rgba(255,255,255,0.75)' }]}>Votre impact</Text>
        <Text style={styles.heroValeur}>{nombre(s.co2Economise)} kg de CO₂ évités</Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
          {s.co2Economise > 0 ? `Soit l'absorption annuelle de ${nombre(arbres)} arbre${arbres >= 2 ? 's' : ''}.` : 'Terminez votre premier trajet partagé pour commencer.'}
        </Text>
      </Card>

      <Row gap={spacing.sm} style={{ marginBottom: spacing.sm }}>
        <StatTile icon="wallet-outline" tone="accent" value={prix(s.argentEconomise)} label="Économisés / reçus" />
        <StatTile icon="car-outline" value={s.trajetsEffectues} label="Trajets partagés" />
      </Row>
      <Card>
        <Detail icon="person-outline" label="En tant que passager" valeur={`${s.trajetsPassager} trajet(s) · ${prix(s.argentEconomisePassager)} économisés vs taxi`} />
        <Detail icon="car-sport-outline" label="En tant que conducteur" valeur={`${s.trajetsConducteur} trajet(s) · ${prix(s.gainsConducteur)} de participation`} />
        <Row style={{ justifyContent: 'space-between', marginTop: spacing.sm }}>
          <Text style={font.small}>Note moyenne reçue</Text>
          <Stars value={s.noteMoyenne} count={s.nombreAvis} />
        </Row>
      </Card>
      <Text style={[font.caption, { marginBottom: spacing.lg }]}>
        Estimations : 0,12 kg de CO₂ par km et par passager ; taxi ≈ 1 DT + 0,6 DT/km.
      </Text>

      <SectionTitle>
        Badges <Text style={font.small}>({debloques}/{s.badges.length})</Text>
      </SectionTitle>
      <View style={styles.grille}>
        {s.badges.map((b) => (
          <View key={b.id} style={[styles.badge, !b.debloque && { opacity: 0.55 }]}>
            <View style={[styles.badgeIcone, { backgroundColor: b.debloque ? colors.accentSoft : colors.input }]}>
              <Ionicons name={b.debloque ? b.icone.replace('-outline', '') : 'lock-closed-outline'} size={24} color={b.debloque ? colors.accentInk : colors.faint} />
            </View>
            <Text style={[font.label, { textAlign: 'center' }]}>{b.titre}</Text>
            <Text style={[font.caption, { textAlign: 'center', fontSize: 11 }]}>{b.description}</Text>
            {b.debloque ? <Badge label="Obtenu" tone="success" style={{ alignSelf: 'center', marginTop: 6 }} /> : null}
          </View>
        ))}
      </View>
    </Screen>
  );
}

function Detail({ icon, label, valeur }) {
  return (
    <Row style={{ marginBottom: spacing.md, alignItems: 'flex-start' }}>
      <Ionicons name={icon} size={18} color={colors.primary} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={font.label}>{label}</Text>
        <Text style={font.small}>{valeur}</Text>
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.success, borderColor: colors.success },
  heroValeur: { color: colors.white, fontSize: 24, fontWeight: '800', marginTop: 4 },
  grille: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: {
    width: '48.5%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
  },
  badgeIcone: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
});
