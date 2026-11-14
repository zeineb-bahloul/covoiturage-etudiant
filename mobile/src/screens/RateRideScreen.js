import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import api from '../api';
import { Avatar, Badge, Button, Card, Chip, EmptyState, ErrorState, Header, Input, Ionicons, Loader, Row, Screen } from '../components/ui';
import { useDonnees } from '../hooks';
import { colors, font, spacing } from '../theme';
import { court, erreurApi } from '../utils';

const LIBELLES = ['', 'Très mauvaise expérience', 'Décevant', 'Correct', 'Très bien', 'Excellent !'];

/** Noter les covoitureurs après un trajet terminé (US14) + compliments / badges (US17). */
export default function RateRideScreen({ navigation }) {
  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState('');
  const [compliments, setCompliments] = useState([]);
  const [envoi, setEnvoi] = useState(false);
  const [faits, setFaits] = useState(0);

  const { data, setData, chargement, erreur, reessayer } = useDonnees(async () => {
    const [aNoter, disponibles] = await Promise.all([api.get('/reviews/a-noter'), api.get('/reviews/compliments')]);
    return { aNoter: aNoter.data, disponibles: disponibles.data };
  });

  if (chargement) return <Loader />;
  if (erreur) return <ErrorState text={erreur} onRetry={reessayer} />;

  const courant = data.aNoter[0];
  const header = <Header title="Noter mes covoitureurs" subtitle={courant ? `${data.aNoter.length} à noter` : null} onBack={() => navigation.goBack()} />;

  if (!courant) {
    return (
      <Screen header={header}>
        <EmptyState
          icon={faits ? 'checkmark-done-circle-outline' : 'star-outline'}
          title={faits ? 'Merci pour vos avis !' : 'Rien à noter pour le moment'}
          text={faits ? 'Vos évaluations renforcent la confiance entre étudiants.' : 'Après chaque trajet terminé, vous pourrez noter vos covoitureurs ici.'}
          action="Retour"
          onAction={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  const choix = data.disponibles.filter((c) => c.roles.includes(courant.roleCible));
  const basculer = (id) => setCompliments((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  const suivant = () => {
    setNote(0);
    setCommentaire('');
    setCompliments([]);
    setData((d) => ({ ...d, aNoter: d.aNoter.slice(1) }));
  };

  const envoyer = async () => {
    if (!note) {
      Alert.alert('Choisissez une note', 'Touchez les étoiles pour noter de 1 à 5.');
      return;
    }
    setEnvoi(true);
    try {
      await api.post('/reviews', { cibleId: courant.cible._id, trajetId: courant.trajet._id, note, commentaire, badges: compliments });
      setFaits((n) => n + 1);
      suivant();
    } catch (err) {
      Alert.alert('Avis non enregistré', erreurApi(err));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Screen
      header={header}
      footer={
        <Row>
          {data.aNoter.length > 1 ? <Button title="Plus tard" variant="outline" style={{ flex: 1 }} onPress={suivant} /> : null}
          <Button title="Envoyer mon avis" style={{ flex: 2 }} onPress={envoyer} loading={envoi} disabled={!note} />
        </Row>
      }
      keyboard
    >
      <Card style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
        <Avatar uri={courant.cible.photo} nom={courant.cible.nom} size={80} />
        <Text style={[font.h2, { marginTop: spacing.md }]}>{courant.cible.nom}</Text>
        <Badge label={courant.roleCible === 'conducteur' ? 'Votre conducteur' : 'Votre passager'} tone="primary" style={{ alignSelf: 'center', marginTop: 6 }} />
        <Text style={[font.caption, { marginTop: spacing.sm }]}>
          {court(courant.trajet.depart?.label)} → {court(courant.trajet.destination?.label)}
        </Text>

        <Row gap={6} style={{ marginTop: spacing.xl }}>
          {[1, 2, 3, 4, 5].map((v) => (
            <Pressable key={v} onPress={() => setNote(v)} hitSlop={4} accessibilityLabel={`${v} étoile(s)`}>
              <Ionicons name={v <= note ? 'star' : 'star-outline'} size={40} color={v <= note ? '#F59E0B' : colors.border} />
            </Pressable>
          ))}
        </Row>
        <Text style={[font.label, { marginTop: spacing.sm, minHeight: 20 }]}>{LIBELLES[note]}</Text>
      </Card>

      <Text style={[font.h3, { marginBottom: spacing.md }]}>Qu'avez-vous apprécié ?</Text>
      <View style={styles.compliments}>
        {choix.map((c) => (
          <Chip key={c.id} label={c.titre} icon={c.icone} selected={compliments.includes(c.id)} onPress={() => basculer(c.id)} />
        ))}
      </View>

      <Input label="Commentaire (facultatif)" placeholder="Un mot pour remercier ou un conseil…" value={commentaire} onChangeText={setCommentaire} multiline maxLength={500} />

      <Pressable
        onPress={() => navigation.navigate('Report', { utilisateurSignaleId: courant.cible._id, utilisateurNom: courant.cible.nom, trajetId: courant.trajet._id })}
        style={{ alignSelf: 'center' }}
        hitSlop={8}
      >
        <Text style={{ color: colors.danger, fontWeight: '600' }}>Un problème ? Signaler {courant.cible.nom.split(' ')[0]}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  compliments: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.lg },
});
