import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import api from '../api';
import { Avatar, Button, Card, ErrorState, Header, Ionicons, Loader, ProgressBar, Row, Screen, Stars } from '../components/ui';
import { useDonnees } from '../hooks';
import { colors, font, radius, scoreTone, spacing } from '../theme';
import { court, nombre } from '../utils';

const CRITERES = [
  { cle: 'proximite', icone: 'location-outline' },
  { cle: 'horaires', icone: 'time-outline' },
  { cle: 'preferences', icone: 'heart-outline' },
  { cle: 'note', icone: 'star-outline' },
];

/** Explication du score de compatibilité sur 100 (cahier des charges §2.2). */
export default function MatchingDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { data, chargement, erreur, reessayer } = useDonnees(async () => {
    const [score, ride] = await Promise.all([api.get(`/rides/${id}/compatibility`), api.get(`/rides/${id}`)]);
    return { ...score.data, ride: ride.data };
  }, [id]);

  if (chargement) return <Loader />;
  if (erreur) return <ErrorState text={erreur} onRetry={reessayer} />;

  const { scoreTotal, details, ride } = data;
  const t = scoreTone(scoreTotal);
  const verdict = scoreTotal >= 80 ? 'Excellente compatibilité' : scoreTotal >= 60 ? 'Bonne compatibilité' : 'Compatibilité faible';
  const calcul = CRITERES.map((c) => `${nombre(details[c.cle].pointsObtenus)}`).join(' + ');

  return (
    <Screen
      header={<Header title="Score de compatibilité" subtitle="Comment est-il calculé ?" onBack={() => navigation.goBack()} />}
      footer={<Button title="Retour au trajet" variant="secondary" onPress={() => navigation.goBack()} />}
    >
      <Card style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
        <View style={[styles.cercle, { borderColor: t.fg, backgroundColor: t.bg }]}>
          <Text style={[styles.score, { color: t.fg }]}>{scoreTotal}</Text>
          <Text style={[font.caption, { color: t.fg }]}>sur 100</Text>
        </View>
        <Text style={[font.h3, { marginTop: spacing.md }]}>{verdict}</Text>
        <Row style={{ marginTop: spacing.md }}>
          <Avatar uri={ride.conducteur.photo} nom={ride.conducteur.nom} size={32} />
          <Text style={font.label}>{ride.conducteur.nom}</Text>
          <Stars value={ride.conducteur.noteMoyenne} size={12} />
        </Row>
        <Text style={[font.caption, { marginTop: 4 }]}>
          {court(ride.depart.label)} → {court(ride.destination.label)} · arrivée {ride.heureArrivee}
        </Text>
      </Card>

      {CRITERES.map((c) => {
        const d = details[c.cle];
        return (
          <Card key={c.cle}>
            <Row style={{ marginBottom: spacing.sm }}>
              <View style={styles.icone}>
                <Ionicons name={c.icone} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={font.label}>{d.titre}</Text>
                <Text style={font.caption}>Poids : {d.poids} %</Text>
              </View>
              <Text style={[font.h3, { color: colors.primary }]}>
                {nombre(d.pointsObtenus)}
                <Text style={font.caption}> / {d.poids}</Text>
              </Text>
            </Row>
            <ProgressBar value={d.scorePourcent} />
            <Text style={[font.small, { marginTop: spacing.sm }]}>{d.description}</Text>
          </Card>
        );
      })}

      <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primarySoft }}>
        <Text style={[font.label, { color: colors.primary }]}>Calcul</Text>
        <Text style={[font.small, { color: colors.text, marginTop: 4 }]}>
          {calcul} = {scoreTotal} / 100
        </Text>
        <Text style={[font.caption, { marginTop: 6 }]}>Proximité 35 % · Horaires 35 % · Préférences 15 % · Note 15 %</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cercle: { width: 120, height: 120, borderRadius: 60, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  score: { fontSize: 40, fontWeight: '900', letterSpacing: -1 },
  icone: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
