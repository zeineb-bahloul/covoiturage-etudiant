import React, { useEffect, useState, useCallback } from 'react';
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
import { colors, shadows, radius } from '../theme';
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
        <Text style={styles.loadingTexte}>Calcul du score de compatibilit\u00e9...</Text>
      </View>
    );
  }

  if (!matchingData || !ride) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.erreurTexte}>Impossible de charger les d\u00e9tails du matching</Text>
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
        subtitle="Algorithme ISET Nabeul"
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
              ? 'Compatibilit\u00e9 Optimale'
              : scoreTotal >= 75
              ? 'Tr\u00e8s Bonne Compatibilit\u00e9'
              : 'Compatibilit\u00e9 Moyenne'}
          </Text>
          <Text style={styles.heroDescription}>
            Ce score sur 100 est calcul\u00e9 en croisant votre emploi du temps universitaire, votre point de
            d\u00e9part et vos affinit\u00e9s avec ce conducteur.
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
                {conducteur?.filiere || '\u00c9tudiant ISET'} \u00b7 \u2605 {(conducteur?.noteMoyenne || 4.8).toFixed(1)} / 5
              </Text>
            </View>

            <View style={styles.priceBadge}>
              <Text style={styles.priceAmount}>{ride.prix} DT</Text>
            </View>
          </View>

          <View style={styles.routeRow}>
            <Text style={styles.routeText} numberOfLines={1}>
              {ride.depart?.label?.split(',')[0]} \u2192 {ride.destination?.label?.split(',')[0]}
            </Text>
            <Text style={styles.timeText}>
              D\u00e9part {ride.heureDepart} \u00b7 Arriv\u00e9e {ride.heureArrivee}
            </Text>
          </View>
        </View>

        {/* D\u00e9tail des 4 Crit\u00e8res */}
        <Text style={styles.sectionTitre}>D\u00c9COMPOSITION DU SCORE</Text>

        {[
          { key: 'proximite', data: details?.proximite, icon: 'P' },
          { key: 'horaires', data: details?.horaires, icon: 'H' },
          { key: 'preferences', data: details?.preferences, icon: 'A' },
          { key: 'note', data: details?.note, icon: 'N' },
        ].map((item) => {
          if (!item.data) return null;
          return (
            <View key={item.key} style={styles.critereCard}>
              <View style={styles.critereHeader}>
                <View style={styles.critereIconBox}>
                  <Text style={styles.critereIconText}>{item.icon}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.critereTitreRow}>
                    <Text style={styles.critereNom}>{item.data.titre}</Text>
                    <Text style={styles.criterePts}>
                      {item.data.pointsObtenus} / {item.data.poids} pts
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressBar,
                        { width: `${item.data.scorePourcent}%` },
                      ]}
                    />
                  </View>
                </View>
              </View>
              <Text style={styles.critereDesc}>{item.data.description}</Text>
            </View>
          );
        })}

        {/* Bouton d'action */}
        <TouchableOpacity
          style={styles.boutonAction}
          onPress={() => navigation.navigate('RideDetail', { id })}
          activeOpacity={0.85}
        >
          <Text style={styles.boutonActionTexte}>Voir l'itin\u00e9raire & R\u00e9server</Text>
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
    borderRadius: radius.full,
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
    borderRadius: radius.lg,
    padding: 22,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    ...shadows.card,
  },
  scoreCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.badgeGoldBg,
    borderWidth: 3,
    borderColor: '#FDE047',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreCircleNumber: {
    fontSize: 26,
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
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 16,
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
    borderRadius: radius.sm,
  },
  priceAmount: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.primary,
  },
  routeRow: {
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
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
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  critereCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
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
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  critereIconText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.primary,
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
    backgroundColor: colors.inputBg,
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
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  boutonAction: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 20,
    ...shadows.elevated,
  },
  boutonActionTexte: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
