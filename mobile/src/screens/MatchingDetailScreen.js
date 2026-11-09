import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
} from 'react-native';
import api from '../api';
import { colors, shadows } from '../theme';
import UniHeader from '../components/UniHeader';

export default function MatchingDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [matchingData, setMatchingData] = useState(null);
  const [ride, setRide] = useState(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/rides/${id}/compatibility`),
      api.get(`/rides/${id}`),
    ])
      .then(([resMatch, resRide]) => {
        setMatchingData(resMatch.data);
        setRide(resRide.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setChargement(false));
  }, [id]);

  if (chargement) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingTexte}>Calcul du score de compatibilité...</Text>
      </View>
    );
  }

  if (!matchingData || !ride) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.erreurTexte}>Impossible de charger les détails du matching</Text>
        <TouchableOpacity style={styles.boutonRetour} onPress={() => navigation.goBack()}>
          <Text style={styles.boutonRetourTexte}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { scoreTotal, details } = matchingData;
  const conducteur = ride.conducteur;

  return (
    <View style={styles.container}>
      <UniHeader
        title="Matching Intelligent"
        subtitle="Algorithme ISET Nabeul (US11)"
        navigation={navigation}
        showBack={true}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Card Score Total (Image 1 - Maquette UniRide) */}
        <View style={styles.heroScoreCard}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreCircleNumber}>{scoreTotal}%</Text>
            <Text style={styles.scoreCircleLabel}>COMPATIBLE</Text>
          </View>

          <Text style={styles.heroTitre}>
            {scoreTotal >= 90
              ? 'Compatibilité Optimale ! 🎉'
              : scoreTotal >= 75
              ? 'Très Bonne Compatibilité 👍'
              : 'Compatibilité Moyenne'}
          </Text>
          <Text style={styles.heroDescription}>
            Ce score sur 100 est calculé en croisant votre emploi du temps universitaire, votre point de
            départ et vos affinités avec ce conducteur.
          </Text>
        </View>

        {/* Conducteur & Trajet Summary */}
        <View style={styles.card}>
          <View style={styles.driverRow}>
            {conducteur?.photo ? (
              <Image source={{ uri: conducteur.photo }} style={styles.driverAvatar} />
            ) : (
              <View style={styles.driverAvatarPlaceholder}>
                <Text style={styles.driverAvatarText}>
                  {conducteur?.nom ? conducteur.nom[0].toUpperCase() : 'C'}
                </Text>
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text style={styles.driverName}>{conducteur?.nom || 'Conducteur ISET'}</Text>
              <Text style={styles.driverSub}>
                🎓 {conducteur?.filiere || 'Étudiant ISET'} · ⭐ {(conducteur?.noteMoyenne || 4.8).toFixed(1)} / 5
              </Text>
            </View>

            <View style={styles.priceBadge}>
              <Text style={styles.priceAmount}>{ride.prix} DT</Text>
            </View>
          </View>

          <View style={styles.routeRow}>
            <Text style={styles.routeText} numberOfLines={1}>
              🟢 {ride.depart?.label?.split(',')[0]} → 🔴 {ride.destination?.label?.split(',')[0]}
            </Text>
            <Text style={styles.timeText}>
              ⏰ Départ {ride.heureDepart} · Arrivée {ride.heureArrivee}
            </Text>
          </View>
        </View>

        {/* Détail des 4 Critères du Cahier des Charges */}
        <Text style={styles.sectionTitre}>Décomposition du score (Pondération officielle)</Text>

        {/* 1. Proximité du point de départ (35%) */}
        {details?.proximite && (
          <View style={styles.critereCard}>
            <View style={styles.critereHeader}>
              <View style={styles.critereIconBox}>
                <Text style={styles.critereIcon}>📍</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.critereTitreRow}>
                  <Text style={styles.critereNom}>{details.proximite.titre}</Text>
                  <Text style={styles.criterePts}>
                    {details.proximite.pointsObtenus} / {details.proximite.poids} pts
                  </Text>
                </View>
                {/* Barre de progression */}
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressBar,
                      { width: `${details.proximite.scorePourcent}%` },
                    ]}
                  />
                </View>
              </View>
            </View>
            <Text style={styles.critereDesc}>{details.proximite.description}</Text>
          </View>
        )}

        {/* 2. Concordance des horaires (35%) */}
        {details?.horaires && (
          <View style={styles.critereCard}>
            <View style={styles.critereHeader}>
              <View style={styles.critereIconBox}>
                <Text style={styles.critereIcon}>⏰</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.critereTitreRow}>
                  <Text style={styles.critereNom}>{details.horaires.titre}</Text>
                  <Text style={styles.criterePts}>
                    {details.horaires.pointsObtenus} / {details.horaires.poids} pts
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressBar,
                      { width: `${details.horaires.scorePourcent}%` },
                    ]}
                  />
                </View>
              </View>
            </View>
            <Text style={styles.critereDesc}>{details.horaires.description}</Text>
          </View>
        )}

        {/* 3. Préférences communes (15%) */}
        {details?.preferences && (
          <View style={styles.critereCard}>
            <View style={styles.critereHeader}>
              <View style={styles.critereIconBox}>
                <Text style={styles.critereIcon}>👥</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.critereTitreRow}>
                  <Text style={styles.critereNom}>{details.preferences.titre}</Text>
                  <Text style={styles.criterePts}>
                    {details.preferences.pointsObtenus} / {details.preferences.poids} pts
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressBar,
                      { width: `${details.preferences.scorePourcent}%` },
                    ]}
                  />
                </View>
              </View>
            </View>
            <Text style={styles.critereDesc}>{details.preferences.description}</Text>
          </View>
        )}

        {/* 4. Note du conducteur (15%) */}
        {details?.note && (
          <View style={styles.critereCard}>
            <View style={styles.critereHeader}>
              <View style={styles.critereIconBox}>
                <Text style={styles.critereIcon}>⭐</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.critereTitreRow}>
                  <Text style={styles.critereNom}>{details.note.titre}</Text>
                  <Text style={styles.criterePts}>
                    {details.note.pointsObtenus} / {details.note.poids} pts
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressBar,
                      { width: `${details.note.scorePourcent}%` },
                    ]}
                  />
                </View>
              </View>
            </View>
            <Text style={styles.critereDesc}>{details.note.description}</Text>
          </View>
        )}

        {/* Bouton d'action */}
        <TouchableOpacity
          style={styles.boutonAction}
          onPress={() => navigation.navigate('RideDetail', { id })}
          activeOpacity={0.85}
        >
          <Text style={styles.boutonActionTexte}>Voir l'itinéraire & Réserver une place</Text>
        </TouchableOpacity>
      </ScrollView>
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
  loadingTexte: {
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
  heroScoreCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    ...shadows.card,
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.badgeGoldBg,
    borderWidth: 4,
    borderColor: '#FDE047',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  scoreCircleNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.badgeGoldText,
  },
  scoreCircleLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.badgeGoldText,
    letterSpacing: 0.6,
  },
  heroTitre: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primaryDark,
    textAlign: 'center',
    marginBottom: 6,
  },
  heroDescription: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 10,
  },
  driverAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  driverAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  driverName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  driverSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  priceBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priceAmount: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.primary,
  },
  routeRow: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
  },
  routeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  timeText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  sectionTitre: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  critereCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  critereHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  critereIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  critereIcon: {
    fontSize: 18,
  },
  critereTitreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  critereNom: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  criterePts: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  critereDesc: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
    marginTop: 2,
  },
  boutonAction: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    ...shadows.card,
  },
  boutonActionTexte: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.3,
  },
});

