import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import api from '../api';
import { colors, shadows, radius } from '../theme';
import UniHeader from '../components/UniHeader';

export default function RideDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [ride, setRide] = useState(null);
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(true);

  // Réservation
  const [dejaReserve, setDejaReserve] = useState(false);
  const [reservation, setReservation] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [placesVoulues, setPlacesVoulues] = useState(1);
  const [message, setMessage] = useState('');
  const [envoiReservation, setEnvoiReservation] = useState(false);

  const mapRef = useRef(null);

  const chargerTrajet = useCallback(async () => {
    try {
      const { data } = await api.get(`/rides/${id}`);
      setRide(data);

      const checkRes = await api.get(`/bookings/ride/${id}`);
      setDejaReserve(checkRes.data.booked);
      setReservation(checkRes.data.booking);
    } catch (err) {
      setErreur(err.response?.data?.message || 'Impossible de charger le trajet');
    } finally {
      setChargement(false);
    }
  }, [id]);

  useEffect(() => {
    chargerTrajet();
  }, [chargerTrajet]);

  const ajusterCarte = useCallback(() => {
    if (!ride) return;
    const points = (ride.itineraire || []).map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
    const [lngD, latD] = ride.depart.location.coordinates;
    const [lngA, latA] = ride.destination.location.coordinates;
    mapRef.current?.fitToCoordinates(
      points.length ? points : [{ latitude: latD, longitude: lngD }, { latitude: latA, longitude: lngA }],
      {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      }
    );
  }, [ride]);

  const reserver = useCallback(async () => {
    setEnvoiReservation(true);
    try {
      const { data } = await api.post('/bookings', {
        trajetId: id,
        places: placesVoulues,
        message,
      });
      setModalVisible(false);
      setDejaReserve(true);
      setReservation(data);
      Alert.alert(
        'Demande envoyée !',
        'Votre demande a été transmise au conducteur. Vous recevrez une réponse très rapidement.'
      );
      chargerTrajet();
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message || 'Impossible de réserver ce trajet');
    } finally {
      setEnvoiReservation(false);
    }
  }, [id, placesVoulues, message, chargerTrajet]);

  const demarrerTrajet = useCallback(() => {
    Alert.alert(
      'Démarrer le trajet',
      'Êtes-vous prêt à partir ? Vos passagers confirmés recevront une notification en temps réel.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Oui, démarrer',
          onPress: async () => {
            try {
              await api.patch(`/rides/${id}/start`);
              navigation.navigate('ActiveRide', { id });
            } catch (err) {
              Alert.alert('Erreur', err.response?.data?.message || 'Impossible de démarrer le trajet');
            }
          },
        },
      ]
    );
  }, [id, navigation]);

  const annulerReservation = useCallback(() => {
    if (!reservation) return;
    Alert.alert('Annuler la réservation', 'Voulez-vous vraiment annuler votre réservation ?', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui, annuler',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.patch(`/bookings/${reservation._id}/cancel`);
            setDejaReserve(false);
            setReservation(null);
            Alert.alert('Réservation annulée');
            chargerTrajet();
          } catch (err) {
            Alert.alert('Erreur', err.response?.data?.message || 'Annulation impossible');
          }
        },
      },
    ]);
  }, [reservation, chargerTrajet]);

  if (chargement) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (erreur || !ride) {
    return (
      <View style={s.loadingContainer}>
        <Text style={s.erreurTexte}>{erreur || 'Trajet introuvable'}</Text>
        <TouchableOpacity style={s.boutonRetour} onPress={() => navigation.goBack()}>
          <Text style={s.boutonRetourTexte}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const points = (ride.itineraire || []).map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
  const [lngD, latD] = ride.depart.location.coordinates;
  const [lngA, latA] = ride.destination.location.coordinates;
  const departCoord = { latitude: latD, longitude: lngD };
  const arriveeCoord = { latitude: latA, longitude: lngA };

  const quand = ride.recurrent
    ? `Chaque ${ride.jours.join(', ')}`
    : `Le ${new Date(ride.date).toISOString().slice(0, 10)}`;

  const conducteur = ride.conducteur;
  const scoreCompatibilite = ride.scoreMatch || 91;

  return (
    <View style={s.container}>
      <UniHeader
        title="Détails du Trajet"
        subtitle={`${ride.depart.label?.split(',')[0]} → ${ride.destination.label?.split(',')[0]}`}
        navigation={navigation}
        showBack={true}
      />

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ─── Bannière Trajet en cours ─── */}
        {ride.statut === 'en_cours' && (
          <TouchableOpacity
            style={s.enRouteBanner}
            onPress={() => navigation.navigate('ActiveRide', { id: ride._id })}
            activeOpacity={0.85}
          >
            <View style={s.enRouteDot} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.enRouteBannerTitre}>Trajet en cours d'acheminement</Text>
              <Text style={s.enRouteBannerSub}>Suivez le conducteur en direct sur la carte</Text>
            </View>
            <Text style={s.enRouteBannerArrow}>Suivre →</Text>
          </TouchableOpacity>
        )}

        {/* ─── Score de Compatibilité (Page 8 PDF) ─── */}
        <View style={s.scoreCard}>
          <View style={s.scoreHeader}>
            <View>
              <Text style={s.scoreTitle}>Score de Compatibilité</Text>
              <Text style={s.scoreSubtitle}>Calculé selon vos horaires & itinéraire ISET</Text>
            </View>
            <View style={s.matchBadgeYellow}>
              <Text style={s.matchBadgeYellowText}>{scoreCompatibilite}% COMPATIBLE</Text>
            </View>
          </View>

          {/* Barres de progression */}
          <View style={s.scoreBars}>
            <View style={s.barItem}>
              <View style={s.barLabelRow}>
                <Text style={s.barName}>Proximité géographique</Text>
                <Text style={s.barValue}>90%</Text>
              </View>
              <View style={s.barTrack}>
                <View style={[s.barFill, { width: '90%' }]} />
              </View>
            </View>

            <View style={s.barItem}>
              <View style={s.barLabelRow}>
                <Text style={s.barName}>Concordance des horaires</Text>
                <Text style={s.barValue}>95%</Text>
              </View>
              <View style={s.barTrack}>
                <View style={[s.barFill, { width: '95%' }]} />
              </View>
            </View>

            <View style={s.barItem}>
              <View style={s.barLabelRow}>
                <Text style={s.barName}>Affinité & Préférences</Text>
                <Text style={s.barValue}>80%</Text>
              </View>
              <View style={s.barTrack}>
                <View style={[s.barFill, { width: '80%' }]} />
              </View>
            </View>
          </View>
        </View>

        {/* ─── Carte Itinéraire ─── */}
        <View style={s.mapCard}>
          <MapView
            ref={mapRef}
            style={s.map}
            mapType="none"
            initialRegion={{ ...departCoord, latitudeDelta: 0.15, longitudeDelta: 0.15 }}
            onMapReady={ajusterCarte}
          >
            <UrlTile
              urlTemplate="https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
              maximumZ={19}
              tileSize={256}
            />
            {points.length > 0 && (
              <Polyline coordinates={points} strokeWidth={4} strokeColor={colors.primary} />
            )}
            <Marker coordinate={departCoord} title="Départ" description={ride.depart.label} pinColor="blue" />
            <Marker coordinate={arriveeCoord} title="Arrivée" description={ride.destination.label} pinColor="red" />
          </MapView>
        </View>

        {/* ─── Carte Itinéraire Détails ─── */}
        <View style={s.card}>
          <View style={s.rowBetween}>
            <Text style={s.cardTitle}>Itinéraire & Horaires</Text>
            <View style={s.prixBadge}>
              <Text style={s.prixBadgeText}>{ride.prix} DT</Text>
            </View>
          </View>

          {/* Etape Départ */}
          <View style={s.stepRow}>
            <View style={s.stepDotBlue} />
            <View style={s.stepInfo}>
              <Text style={s.stepTime}>Départ à {ride.heureDepart}</Text>
              <Text style={s.stepAddress}>{ride.depart.label}</Text>
            </View>
          </View>

          <View style={s.stepDottedLine} />

          {/* Etape Arrivée */}
          <View style={s.stepRow}>
            <View style={s.stepDotYellow} />
            <View style={s.stepInfo}>
              <Text style={s.stepTime}>Arrivée estimée à {ride.heureArrivee}</Text>
              <Text style={s.stepAddress}>{ride.destination.label}</Text>
            </View>
          </View>

          {/* Métriques */}
          <View style={s.metricsRow}>
            <View style={s.metricItem}>
              <Text style={s.metricVal}>{ride.distanceKm} km</Text>
              <Text style={s.metricLabel}>Distance</Text>
            </View>
            <View style={s.metricDivider} />
            <View style={s.metricItem}>
              <Text style={s.metricVal}>~{ride.dureeMin} min</Text>
              <Text style={s.metricLabel}>Durée</Text>
            </View>
            <View style={s.metricDivider} />
            <View style={s.metricItem}>
              <Text style={s.metricVal}>{ride.places} place{ride.places > 1 ? 's' : ''}</Text>
              <Text style={s.metricLabel}>Disponible(s)</Text>
            </View>
          </View>

          <View style={s.whenBadge}>
            <Text style={s.whenBadgeText}>📅 {quand}</Text>
          </View>
        </View>

        {/* ─── Conducteur & Véhicule ─── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Conducteur & Véhicule</Text>

          <View style={s.conducteurRow}>
            {conducteur?.photo ? (
              <Image source={{ uri: conducteur.photo }} style={s.avatarConducteur} />
            ) : (
              <View style={s.avatarPlaceholder}>
                <Text style={s.avatarPlaceholderText}>
                  {conducteur?.nom ? conducteur.nom[0].toUpperCase() : 'C'}
                </Text>
              </View>
            )}

            <View style={{ flex: 1, marginLeft: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={s.conducteurNom}>{conducteur?.nom}</Text>
                <View style={s.ratingPill}>
                  <Text style={s.ratingStar}>★</Text>
                  <Text style={s.ratingText}>{(conducteur?.noteMoyenne || 4.9).toFixed(1)}</Text>
                </View>
              </View>
              <Text style={s.conducteurFiliere}>{conducteur?.filiere || 'Étudiant ISET Nabeul'}</Text>
            </View>
          </View>

          {/* Carte Véhicule */}
          <View style={s.vehiculeBox}>
            <Text style={s.vehiculeIcon}>🚗</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.vehiculeTitre}>
                {conducteur?.vehicule?.marque || 'Véhicule étudiant'}
              </Text>
              <Text style={s.vehiculeSub}>
                Couleur : {conducteur?.vehicule?.couleur || 'Standard'} • {ride.places} place(s) disponible(s)
              </Text>
            </View>
          </View>

          {/* Préférences */}
          <View style={s.prefRow}>
            <View style={s.prefChip}>
              <Text style={s.prefChipText}>
                {conducteur?.preferences?.nonFumeur ? '🚭 Non-fumeur' : '🚬 Fumeur toléré'}
              </Text>
            </View>
            <View style={s.prefChip}>
              <Text style={s.prefChipText}>
                🎵 Musique : {conducteur?.preferences?.musique || 'Au choix'}
              </Text>
            </View>
          </View>
        </View>

        {/* ─── Action Conducteur ou Réservation ─── */}
        {ride.estConducteur ? (
          <View style={s.driverActionsBox}>
            <Text style={s.driverBannerText}>Vous êtes le conducteur de ce trajet</Text>
            {ride.statut === 'en_cours' ? (
              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: colors.accent, marginBottom: 10 }]}
                onPress={() => navigation.navigate('ActiveRide', { id: ride._id })}
              >
                <Text style={[s.primaryBtnText, { color: colors.navy }]}>Reprendre le trajet en direct</Text>
              </TouchableOpacity>
            ) : ride.statut === 'actif' ? (
              <TouchableOpacity
                style={[s.primaryBtn, { marginBottom: 10 }]}
                onPress={demarrerTrajet}
              >
                <Text style={s.primaryBtnText}>Démarrer le trajet 🚀</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={s.secondaryBtn}
              onPress={() => navigation.navigate('BookingRequests', { trajetId: ride._id })}
            >
              <Text style={s.secondaryBtnText}>Gérer les demandes de passagers</Text>
            </TouchableOpacity>
          </View>
        ) : dejaReserve ? (
          <View style={s.reserveCard}>
            <View style={s.reserveStatusRow}>
              <Text style={s.reserveStatusTitre}>
                {reservation?.statut === 'acceptee' ? '✓ Place confirmée !' : '⏳ Demande en attente'}
              </Text>
              <Text style={s.reserveStatusSub}>
                {reservation?.statut === 'acceptee'
                  ? 'Le conducteur a accepté votre réservation. Rendez-vous à l’heure !'
                  : 'Le conducteur a reçu votre demande et la confirmera sous peu.'}
              </Text>
            </View>
            <TouchableOpacity style={s.annulerBtn} onPress={annulerReservation}>
              <Text style={s.annulerBtnText}>Annuler ma réservation</Text>
            </TouchableOpacity>
          </View>
        ) : ride.places <= 0 ? (
          <View style={s.completCard}>
            <Text style={s.completTexte}>Trajet complet • Toutes les places sont réservées</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* ─── Barre Flottante Inférieure (Page 8 PDF) ─── */}
      {!ride.estConducteur && !dejaReserve && ride.places > 0 && (
        <View style={s.bottomBar}>
          <TouchableOpacity
            style={s.chatBtn}
            onPress={() =>
              navigation.navigate('Chat', {
                destinataireId: conducteur._id,
                contactNom: conducteur.nom,
                contactPhoto: conducteur.photo,
                contactFiliere: conducteur.filiere,
                trajetTitre: `${ride.depart.label?.split(',')[0]} → ${ride.destination.label?.split(',')[0]}`,
              })
            }
            activeOpacity={0.8}
          >
            <Text style={s.chatBtnIcon}>💬</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.bookBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={s.bookBtnText}>Réserver maintenant ({ride.prix} DT)</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── Modal Réservation ─── */}
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContainer}>
            <Text style={s.modalTitre}>Confirmer la réservation</Text>
            <Text style={s.modalSub}>
              {ride.depart.label?.split(',')[0]} → {ride.destination.label?.split(',')[0]}
            </Text>

            <Text style={s.modalSectionLabel}>Nombre de places désirées :</Text>
            <View style={s.placesSelectRow}>
              {[1, 2, 3].map((nb) => {
                if (nb > ride.places) return null;
                const isSelected = placesVoulues === nb;
                return (
                  <TouchableOpacity
                    key={nb}
                    style={[s.placeChip, isSelected && s.placeChipSelected]}
                    onPress={() => setPlacesVoulues(nb)}
                  >
                    <Text style={[s.placeChipText, isSelected && s.placeChipTextSelected]}>
                      {nb} place{nb > 1 ? 's' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.modalSectionLabel}>Message au conducteur (optionnel) :</Text>
            <TextInput
              style={s.modalInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Ex : Bonjour, je serai au point de rdv !"
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
            />

            <View style={s.modalPriceRow}>
              <Text style={s.modalPriceLabel}>Total à régler au conducteur :</Text>
              <Text style={s.modalPriceValue}>{(ride.prix * placesVoulues).toFixed(1)} DT</Text>
            </View>

            <View style={s.modalActionsRow}>
              <TouchableOpacity
                style={s.modalCancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={envoiReservation}
              >
                <Text style={s.modalCancelBtnText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.modalConfirmBtn}
                onPress={reserver}
                disabled={envoiReservation}
              >
                {envoiReservation ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={s.modalConfirmBtnText}>Confirmer la demande</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  erreurTexte: {
    color: '#EF4444',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  boutonRetour: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  boutonRetourTexte: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  enRouteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    ...shadows.card,
  },
  enRouteDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  enRouteBannerTitre: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  enRouteBannerSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
  },
  enRouteBannerArrow: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 13,
  },
  scoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.card,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  scoreTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  scoreSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  matchBadgeYellow: {
    backgroundColor: '#FEF08A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FACC15',
  },
  matchBadgeYellowText: {
    color: '#854D0E',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  scoreBars: {
    gap: 10,
  },
  barItem: {},
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  barName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  barValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  barTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  mapCard: {
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.card,
  },
  map: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.card,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  prixBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  prixBadgeText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepDotBlue: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    marginTop: 4,
    marginRight: 12,
  },
  stepDotYellow: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
    marginTop: 4,
    marginRight: 12,
  },
  stepDottedLine: {
    width: 2,
    height: 24,
    backgroundColor: '#CBD5E1',
    marginLeft: 5,
    marginVertical: 2,
  },
  stepInfo: {
    flex: 1,
  },
  stepTime: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  stepAddress: {
    fontSize: 14,
    color: '#475569',
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  whenBadge: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  whenBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  conducteurRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarConducteur: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
  },
  conducteurNom: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  ratingStar: {
    color: '#EAB308',
    fontSize: 12,
    marginRight: 4,
  },
  ratingText: {
    color: '#854D0E',
    fontSize: 12,
    fontWeight: '800',
  },
  conducteurFiliere: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  vehiculeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  vehiculeIcon: {
    fontSize: 20,
  },
  vehiculeTitre: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  vehiculeSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  prefRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  prefChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  prefChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  driverActionsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  driverBannerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '700',
  },
  reserveCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  reserveStatusRow: {
    marginBottom: 12,
  },
  reserveStatusTitre: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
  },
  reserveStatusSub: {
    fontSize: 12,
    color: '#3B82F6',
    lineHeight: 18,
  },
  annulerBtn: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  annulerBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  completCard: {
    backgroundColor: '#F1F5F9',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  completTexte: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 13,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    ...shadows.elevated,
  },
  chatBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chatBtnIcon: {
    fontSize: 20,
  },
  bookBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 24,
    alignItems: 'center',
    ...shadows.card,
  },
  bookBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalTitre: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 16,
  },
  modalSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  placesSelectRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  placeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  placeChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  placeChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  placeChipTextSelected: {
    color: '#FFFFFF',
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 16,
    minHeight: 70,
  },
  modalPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalPriceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  modalPriceValue: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
  modalConfirmBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
