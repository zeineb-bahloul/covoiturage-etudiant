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
} from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import api from '../api';
import { colors, shadows } from '../theme';
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

  const ajusterCarte = () => {
    if (!ride) return;
    const points = ride.itineraire.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
    const [lngD, latD] = ride.depart.location.coordinates;
    const [lngA, latA] = ride.destination.location.coordinates;
    mapRef.current?.fitToCoordinates(
      points.length ? points : [{ latitude: latD, longitude: lngD }, { latitude: latA, longitude: lngA }],
      {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      }
    );
  };

  const reserver = async () => {
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
  };

  const demarrerTrajet = () => {
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
  };

  const annulerReservation = () => {
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
  };

  if (chargement) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (erreur || !ride) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.erreurTexte}>{erreur || 'Trajet introuvable'}</Text>
        <TouchableOpacity style={styles.boutonRetour} onPress={() => navigation.goBack()}>
          <Text style={styles.boutonRetourTexte}>Retour</Text>
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

  return (
    <View style={styles.container}>
      <UniHeader
        title="Détail du trajet"
        subtitle="Itinéraire & Réservation"
        navigation={navigation}
        showBack={true}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Carte OpenStreetMap / CARTO (US8) */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
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
            <Marker coordinate={departCoord} title="Départ" description={ride.depart.label} pinColor="green" />
            <Marker coordinate={arriveeCoord} title="Arrivée" description={ride.destination.label} pinColor="red" />
          </MapView>
          <Text style={styles.mapAttribution}>© OpenStreetMap contributors © CARTO</Text>
        </View>

        {/* Bannière Trajet en cours (US21) */}
        {ride.statut === 'en_cours' && (
          <TouchableOpacity
            style={styles.enRouteBanner}
            onPress={() => navigation.navigate('ActiveRide', { id: ride._id })}
            activeOpacity={0.85}
          >
            <Text style={styles.enRouteBannerIcon}>🚗💨</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.enRouteBannerTitre}>Trajet en cours d'acheminement</Text>
              <Text style={styles.enRouteBannerSub}>Suivez le trajet en direct avec le véhicule</Text>
            </View>
            <Text style={styles.enRouteBannerArrow}>Suivre →</Text>
          </TouchableOpacity>
        )}

        {/* Badge compatibilité intelligent (Image 1 de la maquette - US11) */}
        <TouchableOpacity
          style={styles.compatibiliteCard}
          onPress={() => navigation.navigate('MatchingDetail', { id: ride._id })}
          activeOpacity={0.8}
        >
          <View style={styles.badgeMatchLarge}>
            <Text style={styles.badgeMatchLargeText}>{ride.scoreMatch || 91}% MATCH</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.compatibiliteTitre}>Trajet hautement compatible</Text>
              <Text style={styles.voirDetailLien}>Détails →</Text>
            </View>
            <Text style={styles.compatibiliteDesc}>
              Horaires & proximité alignés avec vos cours à l'ISET Nabeul. Touchez pour voir l'analyse des 4
              critères (35% proximité, 35% horaires...).
            </Text>
          </View>
        </TouchableOpacity>

        {/* Détails du trajet */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Itinéraire</Text>
            <Text style={styles.prixBadge}>{ride.prix} DT</Text>
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepDotGreen} />
            <View style={styles.stepInfo}>
              <Text style={styles.stepLabel}>Départ ({ride.heureDepart})</Text>
              <Text style={styles.stepAddress}>{ride.depart.label}</Text>
            </View>
          </View>

          <View style={styles.stepLine} />

          <View style={styles.stepRow}>
            <View style={styles.stepDotRed} />
            <View style={styles.stepInfo}>
              <Text style={styles.stepLabel}>Arrivée estimée ({ride.heureArrivee})</Text>
              <Text style={styles.stepAddress}>{ride.destination.label}</Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>{ride.distanceKm} km</Text>
              <Text style={styles.metricLabel}>Distance</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>~{ride.dureeMin} min</Text>
              <Text style={styles.metricLabel}>Durée</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>{ride.places}</Text>
              <Text style={styles.metricLabel}>Place(s) libre(s)</Text>
            </View>
          </View>

          <Text style={styles.dateInfo}>📅 {quand}</Text>
        </View>

        {/* Profil du conducteur */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Conducteur</Text>

          <View style={styles.conducteurInfoRow}>
            {conducteur?.photo ? (
              <Image source={{ uri: conducteur.photo }} style={styles.avatarConducteur} />
            ) : (
              <View style={styles.avatarConducteurPlaceholder}>
                <Text style={styles.avatarConducteurText}>
                  {conducteur?.nom ? conducteur.nom[0].toUpperCase() : 'C'}
                </Text>
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text style={styles.nomConducteur}>{conducteur?.nom}</Text>
              <Text style={styles.filiereConducteur}>🎓 {conducteur?.filiere || 'Étudiant ISET Nabeul'}</Text>
              <Text style={styles.noteConducteur}>⭐ {(conducteur?.noteMoyenne || 4.8).toFixed(1)} / 5</Text>
            </View>
          </View>

          {conducteur?.vehicule ? (
            <View style={styles.vehiculeTag}>
              <Text style={styles.vehiculeTexte}>
                🚗 {conducteur.vehicule.marque} · Couleur : {conducteur.vehicule.couleur || 'standard'}
              </Text>
            </View>
          ) : null}

          <View style={styles.prefRow}>
            <View style={styles.prefPill}>
              <Text style={styles.prefPillText}>
                {conducteur?.preferences?.nonFumeur ? '🚭 Non-fumeur' : '🚬 Fumeur toléré'}
              </Text>
            </View>
            <View style={styles.prefPill}>
              <Text style={styles.prefPillText}>
                🎵 Musique : {conducteur?.preferences?.musique || 'au choix'}
              </Text>
            </View>
          </View>

          {/* Boutons d'interaction avec le conducteur (US12 & US15) */}
          {!ride.estConducteur && conducteur && (
            <View style={styles.conducteurActionsRow}>
              <TouchableOpacity
                style={styles.boutonDiscuterConducteur}
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
                <Text style={styles.boutonDiscuterIcone}>💬</Text>
                <Text style={styles.boutonDiscuterTexte}>Envoyer un message</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.boutonSignalerConducteur}
                onPress={() =>
                  navigation.navigate('Report', {
                    utilisateurSignaleId: conducteur._id,
                    utilisateurNom: conducteur.nom,
                    trajetId: ride._id,
                  })
                }
                activeOpacity={0.8}
              >
                <Text style={styles.boutonSignalerIcone}>🛡️</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Section Réservation (US9, US21) */}
        {ride.estConducteur ? (
          <View style={styles.conducteurBanner}>
            <Text style={styles.conducteurBannerText}>Vous êtes le conducteur de ce trajet</Text>

            {ride.statut === 'en_cours' ? (
              <TouchableOpacity
                style={[styles.boutonDemandes, { backgroundColor: colors.accent, marginBottom: 8 }]}
                onPress={() => navigation.navigate('ActiveRide', { id: ride._id })}
              >
                <Text style={styles.boutonDemandesTexte}>📍 Reprendre le trajet en cours</Text>
              </TouchableOpacity>
            ) : ride.statut === 'actif' ? (
              <TouchableOpacity
                style={[styles.boutonDemandes, { backgroundColor: colors.primary, marginBottom: 8 }]}
                onPress={demarrerTrajet}
              >
                <Text style={styles.boutonDemandesTexte}>🚀 Démarrer le trajet (US21)</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[
                styles.boutonDemandes,
                { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
              ]}
              onPress={() => navigation.navigate('BookingRequests', { trajetId: ride._id })}
            >
              <Text style={[styles.boutonDemandesTexte, { color: colors.text }]}>
                Gérer les demandes de passagers
              </Text>
            </TouchableOpacity>
          </View>
        ) : dejaReserve ? (
          <View style={styles.reserveCard}>
            <View style={styles.reserveStatusRow}>
              <Text style={styles.reserveStatusTitre}>
                {reservation?.statut === 'acceptee' ? '✓ Place confirmée !' : '⏳ Demande envoyée (En attente)'}
              </Text>
              <Text style={styles.reserveStatusSub}>
                {reservation?.statut === 'acceptee'
                  ? 'Le conducteur a accepté votre réservation. Soyez ponctuel au rendez-vous !'
                  : 'Le conducteur a reçu votre demande et doit la confirmer.'}
              </Text>
            </View>

            <TouchableOpacity style={styles.boutonAnnulerReservation} onPress={annulerReservation}>
              <Text style={styles.boutonAnnulerReservationTexte}>Annuler cette réservation</Text>
            </TouchableOpacity>
          </View>
        ) : ride.places <= 0 ? (
          <View style={styles.completCard}>
            <Text style={styles.completTexte}>Complet · Toutes les places ont été réservées</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.boutonReserver}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.boutonReserverTexte}>Réserver une place ({ride.prix} DT)</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Modal de réservation (US9) */}
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitre}>Confirmer la réservation</Text>
            <Text style={styles.modalSub}>
              {ride.depart.label?.split(',')[0]} → {ride.destination.label?.split(',')[0]}
            </Text>

            <Text style={styles.labelSection}>Nombre de places :</Text>
            <View style={styles.placesSelectRow}>
              {[1, 2, 3].map((nb) => {
                if (nb > ride.places) return null;
                const estChoisi = placesVoulues === nb;
                return (
                  <TouchableOpacity
                    key={nb}
                    style={[styles.placeChip, estChoisi && styles.placeChipActif]}
                    onPress={() => setPlacesVoulues(nb)}
                  >
                    <Text style={[styles.placeChipTexte, estChoisi && styles.placeChipTexteActif]}>
                      {nb} place{nb > 1 ? 's' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.labelSection}>Message pour {conducteur?.nom} (optionnel) :</Text>
            <TextInput
              style={styles.modalInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Ex : Bonjour, je serai au point de rendez-vous habituel !"
              placeholderTextColor={colors.textLight}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalPrixTotalRow}>
              <Text style={styles.modalPrixTotalLabel}>Total à payer au conducteur :</Text>
              <Text style={styles.modalPrixTotalValeur}>{(ride.prix * placesVoulues).toFixed(1)} DT</Text>
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalBoutonAnnuler}
                onPress={() => setModalVisible(false)}
                disabled={envoiReservation}
              >
                <Text style={styles.modalBoutonAnnulerTexte}>Retour</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBoutonConfirmer}
                onPress={reserver}
                disabled={envoiReservation}
              >
                {envoiReservation ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.modalBoutonConfirmerTexte}>Confirmer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
    color: colors.danger,
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
    color: colors.white,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  mapContainer: {
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  map: {
    flex: 1,
  },
  mapAttribution: {
    position: 'absolute',
    bottom: 4,
    right: 8,
    fontSize: 9,
    color: colors.textMuted,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  enRouteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    ...shadows.card,
  },
  enRouteBannerIcon: {
    fontSize: 24,
  },
  enRouteBannerTitre: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.white,
  },
  enRouteBannerSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 1,
  },
  enRouteBannerArrow: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.white,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  voirDetailLien: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  compatibiliteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    ...shadows.card,
  },
  badgeMatchLarge: {
    backgroundColor: colors.badgeGoldBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeMatchLargeText: {
    color: colors.badgeGoldText,
    fontWeight: '900',
    fontSize: 13,
  },
  compatibiliteTitre: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  compatibiliteDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  prixBadge: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  stepDotGreen: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    marginTop: 4,
    marginRight: 10,
  },
  stepDotRed: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.danger,
    marginTop: 4,
    marginRight: 10,
  },
  stepLine: {
    width: 2,
    height: 20,
    backgroundColor: colors.border,
    marginLeft: 5,
    marginVertical: 2,
  },
  stepInfo: {
    flex: 1,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  stepAddress: {
    fontSize: 13,
    color: colors.text,
    marginTop: 1,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 16,
    marginBottom: 12,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  dateInfo: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  conducteurInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  avatarConducteur: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginRight: 14,
  },
  avatarConducteurPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarConducteurText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
  },
  nomConducteur: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  filiereConducteur: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  noteConducteur: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: '600',
    marginTop: 2,
  },
  vehiculeTag: {
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  vehiculeTexte: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  prefRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  prefPill: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 6,
  },
  prefPillText: {
    fontSize: 12,
    color: colors.text,
  },
  conducteurBanner: {
    backgroundColor: colors.primaryLight,
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 6,
  },
  conducteurBannerText: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 14,
    marginBottom: 10,
  },
  boutonDemandes: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  boutonDemandesTexte: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 13,
  },
  reserveCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  reserveStatusRow: {
    marginBottom: 14,
  },
  reserveStatusTitre: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
  },
  reserveStatusSub: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  boutonAnnulerReservation: {
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: colors.dangerLight,
    alignItems: 'center',
  },
  boutonAnnulerReservationTexte: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 14,
  },
  completCard: {
    backgroundColor: '#F1F5F9',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  completTexte: {
    color: colors.textMuted,
    fontWeight: 'bold',
  },
  boutonReserver: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  boutonReserverTexte: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    ...shadows.capsule,
  },
  modalTitre: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  modalSub: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 18,
  },
  labelSection: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  placesSelectRow: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  placeChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginRight: 8,
  },
  placeChipActif: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  placeChipTexte: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  placeChipTexteActif: {
    color: colors.white,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    textAlignVertical: 'top',
    height: 80,
    marginBottom: 16,
  },
  modalPrixTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  modalPrixTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  modalPrixTotalValeur: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
  },
  modalActionsRow: {
    flexDirection: 'row',
  },
  modalBoutonAnnuler: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginRight: 10,
  },
  modalBoutonAnnulerTexte: {
    color: colors.textMuted,
    fontWeight: '700',
  },
  modalBoutonConfirmer: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    ...shadows.card,
  },
  modalBoutonConfirmerTexte: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
  conducteurActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  boutonDiscuterConducteur: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    paddingVertical: 11,
    borderRadius: 16,
    gap: 6,
  },
  boutonDiscuterIcone: {
    fontSize: 16,
  },
  boutonDiscuterTexte: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  boutonSignalerConducteur: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FFF1F2',
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  boutonSignalerIcone: {
    fontSize: 18,
  },
});
