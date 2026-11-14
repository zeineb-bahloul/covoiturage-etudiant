import React, { useEffect, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../api';
import RouteMap from '../components/RouteMap';
import { Avatar, Badge, Button, Card, ErrorState, Header, IconButton, Ionicons, Loader, ProgressBar, Row, Screen, StatTile } from '../components/ui';
import { useDonnees } from '../hooks';
import { getSocket } from '../socket';
import { colors, font, spacing } from '../theme';
import { court, erreurApi, nombre, prix } from '../utils';

/** Avancement estimé à partir de l'heure de démarrage et de la durée calculée par l'itinéraire. */
function avancement(ride) {
  if (ride.statut === 'termine') return 1;
  if (!ride.startedAt || !ride.dureeMin) return 0;
  const ecoule = (Date.now() - new Date(ride.startedAt).getTime()) / 60000;
  return Math.max(0, Math.min(0.97, ecoule / ride.dureeMin));
}

function positionEstimee(ride, ratio) {
  const pts = ride.itineraire || [];
  if (pts.length < 2) return null;
  const [lng, lat] = pts[Math.min(pts.length - 1, Math.round(ratio * (pts.length - 1)))];
  return { latitude: lat, longitude: lng };
}

/** Trajet en cours : suivi, passagers, fin du trajet (US21). */
export default function ActiveRideScreen({ route, navigation }) {
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const [action, setAction] = useState(false);
  const [recap, setRecap] = useState(null);
  const [, setTick] = useState(0);
  const { data, setData, chargement, erreur, recharger, reessayer } = useDonnees(() => api.get(`/rides/${id}/active`).then((r) => r.data), [id]);

  // Rafraîchir l'avancement toutes les 15 s, et tout de suite si le trajet change d'état
  useEffect(() => {
    const t = setInterval(() => {
      setTick((x) => x + 1);
      recharger();
    }, 15000);
    const socket = getSocket();
    const surNotif = (n) => {
      const tid = n.donnees?.trajetId?._id || n.donnees?.trajetId;
      if (tid === id) recharger();
    };
    socket?.on('notification:new', surNotif);
    return () => {
      clearInterval(t);
      socket?.off('notification:new', surNotif);
    };
  }, [id, recharger]);

  const terminer = () =>
    Alert.alert('Terminer le trajet ?', 'Confirmez que tous les passagers ont été déposés.', [
      { text: 'Pas encore', style: 'cancel' },
      {
        text: 'Terminer',
        onPress: async () => {
          setAction(true);
          try {
            const res = await api.patch(`/rides/${id}/finish`);
            setRecap(res.data.recapitulatif);
            setData((d) => ({ ...d, ride: { ...d.ride, statut: 'termine' } }));
          } catch (err) {
            Alert.alert('Impossible de terminer', erreurApi(err));
          } finally {
            setAction(false);
          }
        },
      },
    ]);

  if (chargement) return <Loader text="Chargement du trajet…" />;
  if (erreur) return <ErrorState text={erreur} onRetry={reessayer} />;

  const { ride, estConducteur, passagers, gainsEstimes, co2EviteKg } = data;
  const termine = ride.statut === 'termine';
  const ratio = avancement(ride);
  const voiture = ride.statut === 'en_cours' ? positionEstimee(ride, ratio) : null;
  const minutesRestantes = Math.max(0, Math.round((1 - ratio) * (ride.dureeMin || 0)));
  const cible = estConducteur ? null : ride.conducteur;

  const signaler = (personne) =>
    navigation.navigate('Report', { utilisateurSignaleId: personne._id, utilisateurNom: personne.nom, trajetId: ride._id });

  return (
    <Screen
      header={
        <Header
          title={termine ? 'Trajet terminé' : estConducteur ? 'Trajet en cours' : 'Votre conducteur est en route'}
          subtitle={`${court(ride.depart.label)} → ${court(ride.destination.label)}`}
          onBack={() => navigation.goBack()}
        />
      }
      footer={
        estConducteur && ride.statut === 'en_cours' ? (
          <Button title="Terminer le trajet" icon="flag" variant="success" onPress={terminer} loading={action} />
        ) : termine ? (
          <Button title="Noter mes covoitureurs" icon="star" onPress={() => navigation.replace('RateRide')} />
        ) : null
      }
    >
      <RouteMap ride={ride} voiture={voiture} height={240} style={{ marginBottom: spacing.md }} />

      <Card>
        <Row style={{ justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <Badge
            label={termine ? 'Arrivé' : ride.statut === 'en_cours' ? 'En route' : 'Pas encore démarré'}
            tone={termine ? 'neutral' : ride.statut === 'en_cours' ? 'success' : 'warning'}
            icon={termine ? 'flag-outline' : 'car-sport-outline'}
          />
          {ride.statut === 'en_cours' ? <Text style={font.label}>≈ {minutesRestantes} min restantes</Text> : null}
        </Row>
        <ProgressBar value={ratio * 100} color={colors.success} />
        <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
          <Text style={font.caption}>{ride.heureDepart} · départ</Text>
          <Text style={font.caption}>arrivée ≈ {ride.heureArrivee}</Text>
        </Row>
        {ride.statut === 'en_cours' ? (
          <Text style={[font.caption, { marginTop: spacing.sm }]}>Position estimée d'après l'heure de départ et la durée de l'itinéraire.</Text>
        ) : null}
      </Card>

      {cible ? (
        <Card>
          <Text style={[font.overline, { marginBottom: spacing.md }]}>Conducteur</Text>
          <Row>
            <Avatar uri={cible.photo} nom={cible.nom} size={46} />
            <View style={{ flex: 1 }}>
              <Text style={font.h3}>{cible.nom}</Text>
              <Text style={font.caption}>
                {cible.vehicule ? `${cible.vehicule.marque} · ${cible.vehicule.couleur} · ${cible.vehicule.matricule}` : ''}
              </Text>
            </View>
            <IconButton icon="chatbubble-outline" onPress={() => navigation.navigate('Chat', { destinataireId: cible._id, trajetId: ride._id })} label="Écrire" />
            <IconButton icon="flag-outline" onPress={() => signaler(cible)} label="Signaler" />
          </Row>
        </Card>
      ) : null}

      <Card>
        <Text style={[font.overline, { marginBottom: spacing.md }]}>Passagers ({passagers.length})</Text>
        {passagers.length === 0 ? (
          <Text style={font.small}>Aucun passager confirmé sur ce trajet.</Text>
        ) : (
          passagers.map((p) => (
            <Row key={p._id} style={{ marginBottom: spacing.md }}>
              <Avatar uri={p.photo} nom={p.nom} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={font.label}>{p.nom}</Text>
                <Text style={font.caption}>
                  {p.places} place(s) · {p.filiere || 'ISET Nabeul'}
                </Text>
              </View>
              {estConducteur ? (
                <>
                  <IconButton icon="chatbubble-outline" onPress={() => navigation.navigate('Chat', { destinataireId: p._id, trajetId: ride._id })} label="Écrire" />
                  <IconButton icon="flag-outline" onPress={() => signaler(p)} label="Signaler" />
                </>
              ) : null}
            </Row>
          ))
        )}
      </Card>

      <Row gap={spacing.sm}>
        {estConducteur ? <StatTile icon="wallet-outline" tone="accent" value={prix(gainsEstimes)} label="Participation" /> : null}
        <StatTile icon="leaf-outline" tone="success" value={`${nombre(co2EviteKg)} kg`} label="CO₂ évité" />
        <StatTile icon="speedometer-outline" value={`${nombre(ride.distanceKm)} km`} label="Distance" />
      </Row>

      <Modal visible={!!recap} animationType="fade" transparent onRequestClose={() => setRecap(null)}>
        <View style={styles.overlay}>
          <View style={[styles.modal, { marginBottom: insets.bottom }]}>
            <View style={styles.check}>
              <Ionicons name="checkmark" size={38} color={colors.white} />
            </View>
            <Text style={[font.h2, { textAlign: 'center' }]}>Trajet terminé !</Text>
            <Text style={[font.small, { textAlign: 'center', marginBottom: spacing.lg }]}>Merci de rendre le campus plus vert.</Text>
            {recap ? (
              <View style={{ alignSelf: 'stretch', gap: 8, marginBottom: spacing.xl }}>
                <Ligne label="Passagers transportés" valeur={recap.passagersTransportes} />
                <Ligne label="Participation reçue" valeur={prix(recap.gainsRealises)} />
                <Ligne label="CO₂ évité" valeur={`${nombre(recap.co2EviteKg)} kg`} />
                <Ligne label="Distance" valeur={`${nombre(recap.distanceKm)} km`} />
              </View>
            ) : null}
            <Button
              title={recap?.passagersTransportes ? 'Noter mes passagers' : 'Fermer'}
              icon={recap?.passagersTransportes ? 'star' : undefined}
              onPress={() => {
                const noter = recap?.passagersTransportes;
                setRecap(null);
                if (noter) navigation.replace('RateRide');
              }}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function Ligne({ label, valeur }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Text style={font.small}>{label}</Text>
      <Text style={font.label}>{valeur}</Text>
    </Row>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.xl },
  modal: { backgroundColor: colors.card, borderRadius: 24, padding: spacing.xl, alignItems: 'center' },
  check: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
});
