import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import api from '../api';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Header, Loader, RouteLine, Row, Screen, Segmented, Stars } from '../components/ui';
import { useDonnees } from '../hooks';
import { colors, font, spacing } from '../theme';
import { court, erreurApi, prix, quand } from '../utils';

export const STATUT_RESERVATION = {
  en_attente: { label: 'En attente', tone: 'warning', icon: 'time-outline' },
  acceptee: { label: 'Confirmée', tone: 'success', icon: 'checkmark-circle-outline' },
  refusee: { label: 'Refusée', tone: 'danger', icon: 'close-circle-outline' },
  annulee: { label: 'Annulée', tone: 'neutral', icon: 'remove-circle-outline' },
};

function estAVenir(b) {
  return ['en_attente', 'acceptee'].includes(b.statut) && b.trajet && ['actif', 'en_cours'].includes(b.trajet.statut);
}

function CarteReservation({ b, navigation, onAnnuler }) {
  const t = b.trajet;
  const c = b.conducteur || {};
  const st = STATUT_RESERVATION[b.statut];
  const termine = t?.statut === 'termine' && b.statut === 'acceptee';
  const enCours = t?.statut === 'en_cours' && b.statut === 'acceptee';
  return (
    <Card onPress={t ? () => navigation.navigate('RideDetail', { id: t._id }) : undefined}>
      <Row style={{ justifyContent: 'space-between', marginBottom: spacing.md }}>
        <Badge label={enCours ? 'En route' : termine ? 'Effectué' : st.label} tone={enCours ? 'info' : termine ? 'primary' : st.tone} icon={enCours ? 'car-sport-outline' : st.icon} />
        <Text style={font.caption}>{t ? quand(t) : 'Trajet supprimé'}</Text>
      </Row>
      {t ? (
        <RouteLine compact depart={court(t.depart?.label)} arrivee={court(t.destination?.label)} heureDepart={t.heureDepart} heureArrivee={t.heureArrivee} />
      ) : null}
      <Row style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderSoft }}>
        <Avatar uri={c.photo} nom={c.nom} size={36} />
        <View style={{ flex: 1 }}>
          <Text style={font.label} numberOfLines={1}>
            {c.nom || 'Conducteur'}
          </Text>
          <Stars value={c.noteMoyenne} size={12} />
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontWeight: '800', color: colors.primary }}>{prix((t?.prix || 0) * (b.places || 1))}</Text>
          <Text style={font.caption}>{b.places} place(s)</Text>
        </View>
      </Row>
      {enCours ? (
        <Button title="Suivre le trajet" icon="navigate-outline" variant="success" size="sm" style={{ marginTop: spacing.md }} onPress={() => navigation.navigate('ActiveRide', { id: t._id })} />
      ) : null}
      {estAVenir(b) && !enCours ? (
        <Row style={{ marginTop: spacing.md }}>
          {b.statut === 'acceptee' ? (
            <Button
              title="Message"
              icon="chatbubble-outline"
              variant="secondary"
              size="sm"
              style={{ flex: 1 }}
              onPress={() => navigation.navigate('Chat', { destinataireId: c._id, trajetId: t._id })}
            />
          ) : null}
          <Button title="Annuler" variant="danger" size="sm" style={{ flex: 1 }} onPress={() => onAnnuler(b)} />
        </Row>
      ) : null}
    </Card>
  );
}

/** Liste des réservations (passager) — utilisée dans l'onglet Trajets et l'écran Mes réservations. */
export function BookingsList({ navigation }) {
  const [filtre, setFiltre] = useState('avenir');
  const { data, chargement, erreur, rafraichir, rafraichissement, recharger, reessayer } = useDonnees(() =>
    api.get('/bookings/my').then((r) => r.data)
  );

  const annuler = (b) =>
    Alert.alert('Annuler la réservation ?', 'Le conducteur sera prévenu et la place sera libérée.', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui, annuler',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.patch(`/bookings/${b._id}/cancel`);
            recharger();
          } catch (err) {
            Alert.alert('Annulation impossible', erreurApi(err));
          }
        },
      },
    ]);

  if (chargement) return <Loader />;
  if (erreur) return <ErrorState text={erreur} onRetry={reessayer} />;

  const avenir = data.filter(estAVenir);
  const historique = data.filter((b) => !estAVenir(b));
  const liste = filtre === 'avenir' ? avenir : historique;

  return (
    <Screen scroll onRefresh={rafraichir} refreshing={rafraichissement} bottomInset={false}>
      <Segmented
        style={{ marginBottom: spacing.lg }}
        value={filtre}
        onChange={setFiltre}
        options={[
          { value: 'avenir', label: 'À venir', count: avenir.length },
          { value: 'historique', label: 'Historique' },
        ]}
      />
      {liste.length === 0 ? (
        <EmptyState
          icon="ticket-outline"
          title={filtre === 'avenir' ? 'Aucune réservation à venir' : 'Aucun historique'}
          text={filtre === 'avenir' ? 'Trouvez un conducteur compatible et réservez votre place.' : 'Vos trajets passés apparaîtront ici.'}
        />
      ) : (
        liste.map((b) => <CarteReservation key={b._id} b={b} navigation={navigation} onAnnuler={annuler} />)
      )}
    </Screen>
  );
}

export default function MyBookingsScreen({ navigation }) {
  return (
    <View style={{ flex: 1 }}>
      <Header title="Mes réservations" subtitle="Trajets en tant que passager" onBack={() => navigation.goBack()} />
      <BookingsList navigation={navigation} />
    </View>
  );
}
