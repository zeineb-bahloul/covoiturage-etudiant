import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import api from '../api';
import { colors, shadows, radius } from '../theme';
import UniHeader from '../components/UniHeader';

export default function ActiveRideScreen({ route, navigation }) {
  const { id } = route.params;
  const [data, setData] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [actionEnCours, setActionEnCours] = useState(false);
  const [modalTermine, setModalTermine] = useState(false);
  const [recap, setRecap] = useState(null);

  const mapRef = useRef(null);

  const charger = useCallback(async () => {
    try {
      const res = await api.get(`/rides/${id}/active`);
      setData(res.data);
      if (res.data.ride?.statut === 'termine') {
        setRecap({
          passagersTransportes: res.data.nbPassagers,
          gainsRealises: res.data.gainsEstimes,
          co2EviteKg: res.data.co2EviteKg,
          distanceKm: res.data.ride?.distanceKm,
        });
      }
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de charger les donn\u00e9es du trajet en cours');
    } finally {
      setChargement(false);
    }
  }, [id]);

  useEffect(() => {
    charger();
    const interval = setInterval(charger, 15000);
    return () => clearInterval(interval);
  }, [charger]);

  const terminerTrajet = useCallback(() => {
    Alert.alert(
      'Terminer le trajet',
      'Confirmez-vous que vous \u00eates bien arriv\u00e9 \u00e0 l\u2019ISET Nabeul et que tous les passagers ont \u00e9t\u00e9 d\u00e9pos\u00e9s ?',
      [
        { text: 'Non, continuer', style: 'cancel' },
        {
          text: 'Oui, terminer',
          style: 'default',
          onPress: async () => {
            setActionEnCours(true);
            try {
              const res = await api.patch(`/rides/${id}/finish`);
              setRecap(res.data.recapitulatif);
              setModalTermine(true);
            } catch (err) {
              Alert.alert('Erreur', err.response?.data?.message || 'Impossible de terminer le trajet');
            } finally {
              setActionEnCours(false);
            }
          },
        },
      ]
    );
  }, [id]);

  const signalerSouci = useCallback(() => {
    const estConducteur = data?.estConducteur;
    const passagers = data?.passagers || [];
    const cible = estConducteur && passagers.length > 0 ? passagers[0] : data?.ride?.conducteur;

    Alert.alert(
      'Signaler un souci',
      'Quel impr\u00e9vu rencontrez-vous ?',
      [
        {
          text: 'Signaler un comportement',
          onPress: () => {
            navigation.navigate('Report', {
              utilisateurSignaleId: cible?._id,
              utilisateurNom: cible?.nom,
              trajetId: data?.ride?._id,
            });
          },
        },
        {
          text: 'Trafic / Ralentissement',
          onPress: () => Alert.alert('Information', 'Notification de retard transmise aux passagers.'),
        },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  }, [data, navigation]);

  if (chargement) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Connexion au suivi de trajet...</Text>
      </View>
    );
  }

  if (!data || !data.ride) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.erreurTexte}>Trajet introuvable ou d\u00e9j\u00e0 cl\u00f4tur\u00e9.</Text>
        <TouchableOpacity style={styles.boutonRetour} onPress={() => navigation.goBack()}>
          <Text style={styles.boutonRetourTexte}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { ride, estConducteur, passagers = [], gainsEstimes = 0, co2EviteKg = 0 } = data;
  const points = (ride.itineraire || []).map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
  const [lngD, latD] = ride.depart.location.coordinates;
  const [lngA, latA] = ride.destination.location.coordinates;
  const arriveeCoord = { latitude: latA, longitude: lngA };

  const posVoiture =
    points.length > 5
      ? points[Math.floor(points.length * 0.6)]
      : { latitude: (latD + latA) / 2, longitude: (lngD + lngA) / 2 };

  return (
    <View style={styles.container}>
      <UniHeader
        title={estConducteur ? 'Trajet en cours' : 'Suivi de trajet'}
        subtitle={ride.destination?.label?.split(',')[0]}
        navigation={navigation}
        showBack={true}
      />

      {/* Capsule d'\u00e9tat "EN ROUTE" (Fid\u00e8le \u00e0 l'image 3 de la maquette) */}
      <View style={styles.enRouteBar}>
        <View style={styles.enRoutePill}>
          <View style={styles.enRouteDot} />
          <Text style={styles.enRouteLabel}>EN ROUTE</Text>
        </View>

        <Text style={styles.enRouteDest} numberOfLines={1}>
          {ride.destination?.label?.split(',')[0]}
        </Text>

        <View style={styles.enRouteMetrics}>
          <Text style={styles.enRouteTime}>~{Math.max(5, Math.round(ride.dureeMin * 0.4))} min</Text>
          <Text style={styles.enRouteKm}>{Math.round(ride.distanceKm * 0.4 * 10) / 10} km restants</Text>
        </View>
      </View>

      {/* Carte avec trajet et v\u00e9hicule */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          mapType="none"
          initialRegion={{ ...posVoiture, latitudeDelta: 0.12, longitudeDelta: 0.12 }}
        >
          <UrlTile
            urlTemplate="https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
            maximumZ={19}
            tileSize={256}
          />
          {points.length > 0 && (
            <Polyline coordinates={points} strokeWidth={4} strokeColor={colors.primary} />
          )}

          <Marker coordinate={posVoiture} title="V\u00e9hicule UniRide">
            <View style={styles.carMarker}>
              <View style={styles.carDot} />
            </View>
          </Marker>

          <Marker coordinate={arriveeCoord} title="Arriv\u00e9e" description={ride.destination?.label} pinColor="red" />
        </MapView>
      </View>

      {/* Panneau inf\u00e9rieur "Vos passagers" (Fid\u00e8le \u00e0 l'image 3) */}
      <ScrollView contentContainerStyle={styles.bottomCard} showsVerticalScrollIndicator={false}>
        <View style={styles.passagersHeaderRow}>
          <Text style={styles.passagersTitre}>
            {estConducteur ? 'Vos passagers' : 'Covoitureurs \u00e0 bord'}
          </Text>
          <View style={styles.presentsBadge}>
            <Text style={styles.presentsBadgeText}>{passagers.length} Pr\u00e9sent(s)</Text>
          </View>
        </View>

        {/* Liste horizontale des passagers */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.passagersScroll}>
          {passagers.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontStyle: 'italic', marginVertical: 10 }}>
              Aucun passager confirm\u00e9 sur ce trajet.
            </Text>
          ) : (
            passagers.map((p) => (
              <View key={p._id} style={styles.passagerItem}>
                {p.photo ? (
                  <Image source={{ uri: p.photo }} style={styles.passagerAvatar} />
                ) : (
                  <View style={styles.passagerAvatarPlaceholder}>
                    <Text style={styles.passagerAvatarText}>
                      {p.nom ? p.nom[0].toUpperCase() : 'P'}
                    </Text>
                  </View>
                )}
                <Text style={styles.passagerNom} numberOfLines={1}>
                  {p.nom?.split(' ')[0]}
                </Text>
                <View style={styles.badgePresentDot} />
              </View>
            ))
          )}
        </ScrollView>

        {/* D\u00e9tails \u00e9cologiques et financiers */}
        <View style={styles.statsCard}>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>GAINS ESTIM\u00c9S</Text>
            <Text style={styles.statVal}>{gainsEstimes.toFixed(1)} DT</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>CO\u2082 \u00c9VIT\u00c9</Text>
            <Text style={styles.statVal}>{co2EviteKg} kg</Text>
          </View>
        </View>

        {/* Boutons d'action */}
        {estConducteur ? (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.boutonSignaler} onPress={signalerSouci} activeOpacity={0.7}>
              <Text style={styles.boutonSignalerTexte}>Signaler un souci</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.boutonTerminer}
              onPress={terminerTrajet}
              disabled={actionEnCours}
              activeOpacity={0.85}
            >
              {actionEnCours ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.boutonTerminerTexte}>Terminer le trajet</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.boutonSignalerLarge} onPress={signalerSouci} activeOpacity={0.7}>
            <Text style={styles.boutonSignalerTexte}>Signaler un probl\u00e8me au conducteur</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Modal / Vue "Trajet Termin\u00e9 !" (Fid\u00e8le \u00e0 l'image 3) */}
      <Modal visible={modalTermine} animationType="slide" transparent={false}>
        <View style={styles.termineContainer}>
          <View style={styles.checkIconBig}>
            <Text style={styles.checkSymbol}>{'\u2713'}</Text>
          </View>

          <Text style={styles.termineTitre}>Trajet Termin\u00e9 !</Text>
          <Text style={styles.termineSousTitre}>
            Merci d'avoir utilis\u00e9 UniRide pour un campus plus vert.
          </Text>

          <View style={styles.recapCard}>
            <Text style={styles.recapCardTitre}>R\u00c9CAPITULATIF DU TRAJET</Text>

            <View style={styles.recapItem}>
              <Text style={styles.recapLabel}>Passagers transport\u00e9s :</Text>
              <Text style={styles.recapValue}>{recap?.passagersTransportes || passagers.length} \u00e9tudiant(s)</Text>
            </View>

            <View style={styles.recapItem}>
              <Text style={styles.recapLabel}>Gains r\u00e9alis\u00e9s :</Text>
              <Text style={styles.recapValue}>{recap?.gainsRealises || gainsEstimes} DT</Text>
            </View>

            <View style={styles.recapItem}>
              <Text style={styles.recapLabel}>Empreinte CO\u2082 \u00e9vit\u00e9e :</Text>
              <Text style={styles.recapValue}>{recap?.co2EviteKg || co2EviteKg} kg CO\u2082</Text>
            </View>

            <View style={styles.recapItem}>
              <Text style={styles.recapLabel}>Distance parcourue :</Text>
              <Text style={styles.recapValue}>{recap?.distanceKm || ride.distanceKm} km</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.boutonNoterAction}
            onPress={() => {
              setModalTermine(false);
              const cible = estConducteur && passagers.length > 0 ? passagers[0] : ride.conducteur;
              navigation.navigate('RateRide', {
                trajetId: ride._id,
                cibleId: cible?._id,
                cibleNom: cible?.nom,
                ciblePhoto: cible?.photo,
                roleCible: estConducteur ? 'passager' : 'conducteur',
              });
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.boutonNoterActionTexte}>Noter l'exp\u00e9rience</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.boutonRetourAccueil}
            onPress={() => {
              setModalTermine(false);
              navigation.navigate('Home');
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.boutonRetourAccueilTexte}>Retour \u00e0 l'accueil</Text>
          </TouchableOpacity>
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  erreurTexte: {
    color: colors.danger,
    fontSize: 15,
    marginBottom: 16,
    textAlign: 'center',
  },
  boutonRetour: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  boutonRetourTexte: {
    color: colors.white,
    fontWeight: 'bold',
  },
  enRouteBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    ...shadows.card,
  },
  enRoutePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  enRouteDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: 6,
  },
  enRouteLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  enRouteDest: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
    marginHorizontal: 8,
  },
  enRouteMetrics: {
    alignItems: 'flex-end',
  },
  enRouteTime: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  enRouteKm: {
    fontSize: 10,
    color: colors.textMuted,
  },
  mapContainer: {
    height: 240,
    marginHorizontal: 16,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  map: {
    flex: 1,
  },
  carMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    ...shadows.card,
  },
  carDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.white,
  },
  bottomCard: {
    padding: 16,
    paddingBottom: 40,
  },
  passagersHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  passagersTitre: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  presentsBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  presentsBadgeText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  passagersScroll: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  passagerItem: {
    alignItems: 'center',
    marginRight: 16,
  },
  passagerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: 4,
  },
  passagerAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: 4,
  },
  passagerAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  passagerNom: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    maxWidth: 60,
    textAlign: 'center',
  },
  badgePresentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 2,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    justifyContent: 'space-around',
    ...shadows.card,
  },
  statCol: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  statVal: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.primary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.borderLight,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  boutonSignaler: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  boutonSignalerTexte: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  boutonTerminer: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    ...shadows.elevated,
  },
  boutonTerminerTexte: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
  boutonSignalerLarge: {
    paddingVertical: 14,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  termineContainer: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIconBig: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    ...shadows.elevated,
  },
  checkSymbol: {
    fontSize: 40,
    color: colors.white,
    fontWeight: '900',
  },
  termineTitre: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 6,
  },
  termineSousTitre: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  recapCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  recapCardTitre: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  recapItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  recapLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  recapValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  boutonNoterAction: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: radius.full,
    alignItems: 'center',
    marginBottom: 12,
    ...shadows.elevated,
  },
  boutonNoterActionTexte: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  boutonRetourAccueil: {
    width: '100%',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  boutonRetourAccueilTexte: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
});
