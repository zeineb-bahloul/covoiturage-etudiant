import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import api from '../api';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Header, IconButton, Loader, Notice, RouteLine, Row, Screen, Segmented } from '../components/ui';
import { useDonnees } from '../hooks';
import { colors, font, spacing } from '../theme';
import { court, erreurApi, prix, quand } from '../utils';

const STATUT_TRAJET = {
  actif: { label: 'À venir', tone: 'primary', icon: 'calendar-outline' },
  en_cours: { label: 'En cours', tone: 'success', icon: 'car-sport-outline' },
  termine: { label: 'Terminé', tone: 'neutral', icon: 'flag-outline' },
  annule: { label: 'Annulé', tone: 'danger', icon: 'close-circle-outline' },
};

function CarteTrajet({ t, navigation, onDemarrer, onAnnuler }) {
  const st = STATUT_TRAJET[t.statut];
  const actif = t.statut === 'actif';
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between', marginBottom: spacing.md }}>
        <Badge label={st.label} tone={st.tone} icon={st.icon} />
        <Text style={font.caption}>{quand(t)}</Text>
      </Row>
      <RouteLine compact depart={court(t.depart.label)} arrivee={court(t.destination.label)} heureDepart={t.heureDepart} heureArrivee={t.heureArrivee} />

      <Row style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderSoft, justifyContent: 'space-between' }}>
        <Row gap={0} style={{ flex: 1 }}>
          {(t.passagersConfirmes || []).slice(0, 4).map((p, i) => (
            <Avatar key={p._id} uri={p.photo} nom={p.nom} size={30} style={{ borderWidth: 2, borderColor: colors.white, marginLeft: i ? -8 : 0 }} />
          ))}
          <Text style={[font.caption, { marginLeft: t.passagersConfirmes?.length ? 8 : 0, flex: 1 }]} numberOfLines={1}>
            {t.demandesAcceptees} passager(s) · {t.places} place(s) libre(s)
          </Text>
        </Row>
        <Text style={{ fontWeight: '800', color: colors.primary }}>{prix(t.prix)}</Text>
      </Row>

      {t.demandesEnAttente > 0 ? (
        <Notice
          style={{ marginTop: spacing.md, marginBottom: 0 }}
          tone="info"
          icon="person-add-outline"
          text={`${t.demandesEnAttente} demande(s) en attente`}
          action="Répondre"
          onAction={() => navigation.navigate('BookingRequests', { trajetId: t._id })}
        />
      ) : null}

      {t.statut === 'en_cours' ? (
        <Button title="Ouvrir le trajet en cours" icon="navigate-outline" variant="success" size="sm" style={{ marginTop: spacing.md }} onPress={() => navigation.navigate('ActiveRide', { id: t._id })} />
      ) : null}

      {actif ? (
        <Row style={{ marginTop: spacing.md }}>
          <Button title="Démarrer" icon="play" size="sm" style={{ flex: 1.4 }} onPress={() => onDemarrer(t)} />
          <IconButton icon="create-outline" onPress={() => navigation.navigate('EditRide', { trajet: t })} label="Modifier" />
          <IconButton icon="people-outline" onPress={() => navigation.navigate('BookingRequests', { trajetId: t._id })} label="Demandes" />
          <IconButton icon="trash-outline" tone="danger" onPress={() => onAnnuler(t)} label="Annuler" />
        </Row>
      ) : null}
    </Card>
  );
}

/** Trajets publiés (conducteur) — utilisée dans l'onglet Trajets et l'écran Mes trajets. */
export function RidesList({ navigation }) {
  const [filtre, setFiltre] = useState('avenir');
  const { data, chargement, erreur, rafraichir, rafraichissement, recharger, reessayer } = useDonnees(async () => {
    const [user, avenir, historique] = await Promise.all([
      api.get('/auth/me').then((r) => r.data),
      api.get('/rides/mine').then((r) => r.data),
      api.get('/rides/mine', { params: { historique: 1 } }).then((r) => r.data),
    ]);
    return { user, avenir, historique };
  });

  const demarrer = (t) =>
    Alert.alert('Démarrer le trajet ?', 'Vos passagers confirmés seront prévenus que vous êtes en route.', [
      { text: 'Pas encore', style: 'cancel' },
      {
        text: 'Démarrer',
        onPress: async () => {
          try {
            await api.patch(`/rides/${t._id}/start`);
            navigation.navigate('ActiveRide', { id: t._id });
          } catch (err) {
            Alert.alert('Impossible de démarrer', erreurApi(err));
          }
        },
      },
    ]);

  const annuler = (t) =>
    Alert.alert('Annuler ce trajet ?', 'Toutes les réservations seront annulées et les passagers prévenus.', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui, annuler',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/rides/${t._id}`);
            recharger();
          } catch (err) {
            Alert.alert('Annulation impossible', erreurApi(err));
          }
        },
      },
    ]);

  if (chargement) return <Loader />;
  if (erreur) return <ErrorState text={erreur} onRetry={reessayer} />;

  if (!data.user.vehicule) {
    return (
      <Screen bottomInset={false}>
        <EmptyState
          icon="car-outline"
          title="Devenez conducteur"
          text="Ajoutez votre véhicule pour proposer vos places libres aux étudiants qui vont dans la même direction."
          action="Ajouter mon véhicule"
          onAction={() => navigation.navigate('Vehicle')}
        />
      </Screen>
    );
  }

  const liste = filtre === 'avenir' ? data.avenir : data.historique;
  return (
    <Screen scroll onRefresh={rafraichir} refreshing={rafraichissement} bottomInset={false}>
      <Row style={{ marginBottom: spacing.lg }}>
        <Segmented
          style={{ flex: 1 }}
          value={filtre}
          onChange={setFiltre}
          options={[
            { value: 'avenir', label: 'À venir', count: data.avenir.length },
            { value: 'historique', label: 'Historique' },
          ]}
        />
        <IconButton icon="add" tone="primary" onPress={() => navigation.navigate('PublishRide')} label="Publier" />
      </Row>
      {liste.length === 0 ? (
        <EmptyState
          icon="car-outline"
          title={filtre === 'avenir' ? 'Aucun trajet publié' : 'Aucun trajet passé'}
          text={filtre === 'avenir' ? 'Publiez votre trajet habituel vers l’ISET pour partager les frais.' : 'Vos trajets terminés ou annulés apparaîtront ici.'}
          action={filtre === 'avenir' ? 'Publier un trajet' : null}
          onAction={() => navigation.navigate('PublishRide')}
        />
      ) : (
        liste.map((t) => <CarteTrajet key={t._id} t={t} navigation={navigation} onDemarrer={demarrer} onAnnuler={annuler} />)
      )}
    </Screen>
  );
}

export default function MyRidesScreen({ navigation }) {
  return (
    <View style={{ flex: 1 }}>
      <Header title="Mes trajets" subtitle="Espace conducteur" onBack={() => navigation.goBack()} />
      <RidesList navigation={navigation} />
    </View>
  );
}
