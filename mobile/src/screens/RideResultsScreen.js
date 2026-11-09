import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
} from 'react-native';
import api from '../api';
import { colors, shadows } from '../theme';
import UniHeader from '../components/UniHeader';

export default function RideResultsScreen({ route, navigation }) {
  const { lat, lng, label, date, heure, prixMax, noteMin, nonFumeur, mixte } = route.params;
  const [trajets, setTrajets] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    api
      .get('/rides/search', {
        params: { lat, lng, date, heure, prixMax, noteMin, nonFumeur, mixte },
      })
      .then(({ data }) => setTrajets(data))
      .catch((err) => setErreur(err.response?.data?.message || 'Impossible de joindre le serveur'))
      .finally(() => setChargement(false));
  }, [lat, lng, date, heure, prixMax, noteMin, nonFumeur, mixte]);

  if (chargement) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingTexte}>Recherche des meilleurs trajets...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <UniHeader
        title="Résultats de recherche"
        subtitle={`${trajets.length} trajet(s) disponible(s)`}
        navigation={navigation}
        showBack={true}
      />

      <View style={styles.filterSummary}>
        <Text style={styles.filterSummaryText} numberOfLines={1}>
          📍 Près de « {label} » · 📅 {date}
        </Text>
      </View>

      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}

      <FlatList
        data={trajets}
        keyExtractor={(t) => t._id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          erreur ? null : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>Aucun trajet trouvé</Text>
              <Text style={styles.emptySub}>
                Aucun covoiturage ne correspond exactement à vos critères pour cette date. Essayez d'élargir
                vos filtres ou vérifiez un autre jour.
              </Text>
              <TouchableOpacity style={styles.boutonRecommencer} onPress={() => navigation.goBack()}>
                <Text style={styles.boutonRecommencerTexte}>Modifier ma recherche</Text>
              </TouchableOpacity>
            </View>
          )
        }
        renderItem={({ item }) => {
          const conducteur = item.conducteur;

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('RideDetail', { id: item._id })}
              activeOpacity={0.8}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.driverInfoRow}>
                  {conducteur?.photo ? (
                    <Image source={{ uri: conducteur.photo }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {conducteur?.nom ? conducteur.nom[0].toUpperCase() : 'C'}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.driverName} numberOfLines={1}>
                      {conducteur?.nom || 'Conducteur ISET'}
                    </Text>
                    <Text style={styles.driverFiliere}>
                      🎓 {conducteur?.filiere || 'ISET Nabeul'} · ⭐ {(conducteur?.noteMoyenne || 4.8).toFixed(1)}
                    </Text>
                  </View>
                </View>

                <View style={styles.badgeMatch}>
                  <Text style={styles.badgeMatchTexte}>{item.scoreMatch || 91}% MATCH</Text>
                </View>
              </View>

              <View style={styles.routeContainer}>
                <View style={styles.routePoints}>
                  <Text style={styles.routeDeparture} numberOfLines={1}>
                    🟢 {item.depart.label}
                  </Text>
                  <Text style={styles.routeDestination} numberOfLines={1}>
                    🔴 {item.destination.label}
                  </Text>
                </View>

                <View style={styles.priceContainer}>
                  <Text style={styles.priceAmount}>{item.prix} DT</Text>
                  <Text style={styles.priceSub}>par place</Text>
                </View>
              </View>

              <View style={styles.cardBottomRow}>
                <View style={styles.timeTag}>
                  <Text style={styles.timeTagText}>
                    ⏰ {item.heureDepart} → {item.heureArrivee}
                  </Text>
                </View>

                <Text style={styles.distanceInfo}>
                  À {item.distanceDepartKm} km · {item.places} place(s)
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
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
  },
  loadingTexte: {
    marginTop: 12,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  filterSummary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: '#BBF7D0',
  },
  filterSummaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  erreur: {
    color: colors.danger,
    textAlign: 'center',
    margin: 12,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  driverName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  driverFiliere: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  badgeMatch: {
    backgroundColor: colors.badgeGoldBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeMatchTexte: {
    color: colors.badgeGoldText,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  routeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  routePoints: {
    flex: 1,
    marginRight: 10,
  },
  routeDeparture: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  routeDestination: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
  },
  priceSub: {
    fontSize: 10,
    color: colors.textMuted,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeTag: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  timeTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  distanceInfo: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  boutonRecommencer: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    ...shadows.card,
  },
  boutonRecommencerTexte: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
});
