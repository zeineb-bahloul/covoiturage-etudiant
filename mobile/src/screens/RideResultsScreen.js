import React, { useEffect, useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import api from '../api';
import { colors, shadows, radius } from '../theme';

const ResultCard = memo(({ item, onSelect }) => {
  const conducteur = item.conducteur || {};
  const score = item.scoreMatch || 98;

  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View style={s.driverRow}>
          {conducteur?.photo ? (
            <Image source={{ uri: conducteur.photo }} style={s.avatar} />
          ) : (
            <View style={s.avatarPlaceholder}>
              <Text style={s.avatarInitial}>
                {conducteur?.nom ? conducteur.nom[0].toUpperCase() : 'S'}
              </Text>
            </View>
          )}

          <View>
            <Text style={s.driverName}>{conducteur?.nom || 'Sami Ben Amor'}</Text>
            <Text style={s.driverMeta}>
              ★ {(conducteur?.noteMoyenne || 4.9).toFixed(1)} • {conducteur?.filiere || 'ISET Nabeul'}
            </Text>
          </View>
        </View>

        <View style={s.priceBox}>
          <Text style={s.priceVal}>{item.prix || 2.5} DT</Text>
          <Text style={s.priceSub}>PAR TRAJET</Text>
        </View>
      </View>

      {/* Itinéraire */}
      <View style={s.routeContainer}>
        <View style={s.dotsCol}>
          <View style={s.dotHollow} />
          <View style={s.dotLine} />
          <View style={s.dotSolid} />
        </View>
        <View style={s.routeTexts}>
          <Text style={s.routeItem}>
            {item.heureDepart || '07:45'} - {item.depart?.label?.split(',')[0] || 'Hammamet Nord'}
          </Text>
          <Text style={s.routeItem}>
            {item.heureArrivee || '08:15'} - {item.destination?.label?.split(',')[0] || 'ISET Nabeul'}
          </Text>
        </View>
      </View>

      {/* Footer (Page 6) */}
      <View style={s.cardFooter}>
        <View style={s.footerLeft}>
          <Text style={s.placesText}>{item.places || 2} PLACES LIBRES</Text>
          <View style={s.scoreBadge}>
            <Text style={s.scoreBadgeText}>{score}% SCORE</Text>
          </View>
        </View>

        <TouchableOpacity
          style={s.btnDetails}
          onPress={() => onSelect(item._id)}
          activeOpacity={0.8}
        >
          <Text style={s.btnDetailsText}>DÉTAILS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function RideResultsScreen({ route, navigation }) {
  const { lat, lng, label, date, heure, prixMax } = route.params;
  const [trajets, setTrajets] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    api
      .get('/rides/search', { params: { lat, lng, date, heure, prixMax } })
      .then(({ data }) => setTrajets(data))
      .catch(() => {})
      .finally(() => setChargement(false));
  }, [lat, lng, date, heure, prixMax]);

  const onSelect = useCallback((id) => {
    navigation.navigate('RideDetail', { id });
  }, [navigation]);

  if (chargement) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const listeAffichee = trajets.length > 0 ? trajets : [
    {
      _id: 'res1',
      conducteur: { nom: 'Sami Ben Amor', noteMoyenne: 4.9, filiere: 'ISET Nabeul (Enseignant)' },
      prix: 2.5,
      heureDepart: '07:45',
      heureArrivee: '08:15',
      depart: { label: 'Hammamet Nord' },
      destination: { label: 'ISET Nabeul' },
      places: 2,
      scoreMatch: 98,
    },
    {
      _id: 'res2',
      conducteur: { nom: 'Omar Mejri', noteMoyenne: 4.2, filiere: 'Étudiant IT' },
      prix: 3.0,
      heureDepart: '08:00',
      heureArrivee: '08:30',
      depart: { label: 'Nabeul Centre' },
      destination: { label: 'ISET Nabeul' },
      places: 3,
      scoreMatch: 82,
    },
  ];

  return (
    <View style={s.container}>
      {/* ─── Header Bleu Royal UniRide (Page 6) ─── */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Text style={s.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Trouver un trajet</Text>
        </View>

        <View style={s.searchBarSummary}>
          <Text style={s.summaryText} numberOfLines={1}>
            📍 {label || 'Départ'} ➔ ISET Nabeul
          </Text>
          <Text style={s.summaryDate}>📅 {date || "Aujourd'hui"} {heure ? `• ${heure}` : ''}</Text>
        </View>
      </View>

      {/* ─── Barre de tri (Page 6) ─── */}
      <View style={s.sortBar}>
        <Text style={s.resultsCount}>{listeAffichee.length} TRAJETS TROUVÉS</Text>
        <TouchableOpacity style={s.sortBtn}>
          <Text style={s.sortText}>Trier par: Score ⌄</Text>
        </TouchableOpacity>
      </View>

      {/* ─── Liste des Trajets ─── */}
      <FlatList
        data={listeAffichee}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <ResultCard item={item} onSelect={onSelect} />}
        contentContainerStyle={s.listContent}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 36,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  backArrow: {
    fontSize: 28,
    color: colors.white,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
  },
  searchBarSummary: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.md,
    padding: 12,
  },
  summaryText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  summaryDate: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  sortBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  resultsCount: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  sortText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  avatarInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  driverName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  driverMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  priceBox: {
    alignItems: 'flex-end',
  },
  priceVal: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
  },
  priceSub: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  routeContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 12,
  },
  dotsCol: {
    alignItems: 'center',
    marginRight: 10,
    paddingVertical: 2,
  },
  dotHollow: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dotLine: {
    width: 2,
    height: 18,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  dotSolid: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  routeTexts: {
    justifyContent: 'space-between',
    gap: 8,
  },
  routeItem: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  placesText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
  },
  scoreBadge: {
    backgroundColor: colors.badgeMatchBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  scoreBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.badgeMatchText,
  },
  btnDetails: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: radius.md,
  },
  btnDetailsText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
});
