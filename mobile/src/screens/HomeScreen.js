import React, { useEffect, useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  RefreshControl,
  Platform,
} from 'react-native';
import api from '../api';
import { colors, shadows, radius } from '../theme';

/* ─── Carte Suggestion IA (Fidèle à la Page 4) ──────────────── */
const SuggestionCard = memo(({ item, onSelectDetail }) => {
  const conducteur = item.conducteur || item.conducteurId || {};

  return (
    <View style={s.card}>
      <View style={s.cardTopRow}>
        <View style={s.driverRow}>
          {conducteur?.photo ? (
            <Image source={{ uri: conducteur.photo }} style={s.avatar} />
          ) : (
            <View style={s.avatarPlaceholder}>
              <Text style={s.avatarInitial}>
                {conducteur?.nom ? conducteur.nom[0].toUpperCase() : 'C'}
              </Text>
            </View>
          )}
          <View>
            <Text style={s.driverName}>{conducteur?.nom || 'Karim Z.'}</Text>
            <Text style={s.driverRating}>
              ★ {(conducteur?.noteMoyenne || 4.8).toFixed(1)} ({conducteur?.nombreAvis || 12} avis)
            </Text>
          </View>
        </View>

        <View style={s.priceBox}>
          <Text style={s.priceAmount}>{item.prix || 20} DT</Text>
          <Text style={s.priceSub}>par semaine</Text>
        </View>
      </View>

      {/* Trajet */}
      <View style={s.routeBox}>
        <View style={s.routeItem}>
          <View style={s.dotBlue} />
          <Text style={s.routeText}>
            Arrivée à {item.heureArrivee || '8h15'} ({item.destination?.label?.split(',')[0] || 'ISET Nabeul'})
          </Text>
        </View>
        <View style={s.routeItem}>
          <View style={s.dotGray} />
          <Text style={s.routeTextMuted}>
            Départ {item.depart?.label?.split(',')[0] || 'Ariana'} (1.5 km de vous)
          </Text>
        </View>
      </View>

      {/* Footer Tags & Bouton Détails */}
      <View style={s.cardFooter}>
        <View style={s.tagsRow}>
          <View style={s.tagPill}>
            <Text style={s.tagText}>NON-FUMEUR</Text>
          </View>
          <View style={s.tagPill}>
            <Text style={s.tagText}>MIXTE</Text>
          </View>
          <View style={s.badgeMatch}>
            <Text style={s.badgeMatchText}>{item.scoreMatch || 91}% COMPATIBLE</Text>
          </View>
        </View>

        <TouchableOpacity
          style={s.btnDetails}
          onPress={() => onSelectDetail(item._id)}
          activeOpacity={0.8}
        >
          <Text style={s.btnDetailsText}>Détails</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

/* ─── Écran Accueil (Page 4) ────────────────────────────────── */
export default function HomeScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [stats, setStats] = useState(null);
  const [nbNotifs, setNbNotifs] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [rafraichir, setRafraichir] = useState(false);

  const charger = useCallback(async () => {
    try {
      const [resUser, resSugg, resNotif, resStats] = await Promise.all([
        api.get('/auth/me'),
        api.get('/rides/suggestions').catch(() => ({ data: [] })),
        api.get('/notifications').catch(() => ({ data: { nbNonLues: 0 } })),
        api.get('/stats/me').catch(() => ({ data: null })),
      ]);
      setUser(resUser.data);
      setSuggestions(resSugg.data || []);
      setNbNotifs(resNotif.data?.nbNonLues || 0);
      setStats(resStats.data);
    } catch (err) {
      console.log('Erreur chargement :', err);
    } finally {
      setChargement(false);
      setRafraichir(false);
    }
  }, []);

  useEffect(() => {
    charger();
    const unsub = navigation.addListener('focus', charger);
    return unsub;
  }, [navigation, charger]);

  const onSelectDetail = useCallback((id) => {
    navigation.navigate('RideDetail', { id });
  }, [navigation]);

  if (chargement) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const prenom = user?.nom ? user.nom.split(' ')[0] : 'Sara';

  const headerComponent = (
    <>
      {/* ─── Header Bleu Royal UniRide (Page 4) ─── */}
      <View style={s.header}>
        <View style={s.headerTopRow}>
          <TouchableOpacity
            style={s.userProfileRow}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}
          >
            {user?.photo ? (
              <Image source={{ uri: user.photo }} style={s.headerAvatar} />
            ) : (
              <View style={s.headerAvatarPlaceholder}>
                <Text style={s.headerAvatarInitial}>{prenom[0]}</Text>
              </View>
            )}
            <View style={{ marginLeft: 10 }}>
              <Text style={s.headerBonjour}>BONJOUR,</Text>
              <Text style={s.headerUserName}>{prenom} 👋</Text>
            </View>
          </TouchableOpacity>

          <View style={s.headerActions}>
            <TouchableOpacity
              style={s.notifBtn}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Text style={s.notifIcon}>🔔</Text>
              {nbNotifs > 0 && <View style={s.notifBadge} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={s.publishRoundBtn}
              onPress={() => navigation.navigate('PublishRide')}
            >
              <Text style={s.publishRoundBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={s.headerQuestion}>Où allons-nous aujourd'hui ?</Text>

        {/* ─── Barre Dual Chercher / Publier ─── */}
        <View style={s.searchToggleBar}>
          <TouchableOpacity
            style={s.searchYellowBtn}
            onPress={() => navigation.navigate('SearchRide')}
            activeOpacity={0.85}
          >
            <Text style={s.searchYellowText}>⌕ Chercher</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.publishToggleBtn}
            onPress={() => navigation.navigate('PublishRide')}
            activeOpacity={0.85}
          >
            <Text style={s.publishToggleText}>🚗 Publier</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Statistiques Écologiques (CO2 évité, Économisé) ─── */}
      <View style={s.statsCardsRow}>
        <View style={s.statCard}>
          <View style={s.statIconCircleBlue}>
            <Text style={s.statIcon}>🌱</Text>
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={s.statLabel}>CO₂ ÉVITÉ</Text>
            <Text style={s.statValue}>{stats?.co2Economise || 12.5} kg</Text>
          </View>
        </View>

        <View style={s.statCard}>
          <View style={s.statIconCircleYellow}>
            <Text style={s.statIcon}>💰</Text>
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={s.statLabel}>ÉCONOMISÉ</Text>
            <Text style={s.statValue}>{stats?.argentEconomise || 45.0} DT</Text>
          </View>
        </View>
      </View>

      {/* ─── Section Suggestions IA ─── */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Suggestions IA</Text>
        <TouchableOpacity onPress={() => navigation.navigate('SearchRide')}>
          <Text style={s.voirToutText}>VOIR TOUT</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <View style={s.container}>
      <FlatList
        data={suggestions.length > 0 ? suggestions : [
          {
            _id: 'demo1',
            conducteur: { nom: 'Karim Z.', noteMoyenne: 4.8, nombreAvis: 12 },
            prix: 20,
            heureDepart: '07:45',
            heureArrivee: '08:15',
            depart: { label: 'Ariana' },
            destination: { label: 'ISET Nabeul' },
            scoreMatch: 91,
          },
          {
            _id: 'demo2',
            conducteur: { nom: 'Linda M.', noteMoyenne: 4.5, nombreAvis: 8 },
            prix: 15,
            heureDepart: '07:55',
            heureArrivee: '08:25',
            depart: { label: 'Hammamet' },
            destination: { label: 'ISET Nabeul' },
            scoreMatch: 84,
          },
        ]}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <SuggestionCard item={item} onSelectDetail={onSelectDetail} />
        )}
        ListHeaderComponent={headerComponent}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl
            refreshing={rafraichir}
            onRefresh={() => {
              setRafraichir(true);
              charger();
            }}
            colors={[colors.primary]}
          />
        }
      />

      {/* ─── Barre de Navigation Inférieure (Fidèle à la Maquette) ─── */}
      <View style={s.bottomNav}>
        <TouchableOpacity style={s.navItem} onPress={() => {}}>
          <Text style={[s.navIcon, { color: colors.primary }]}>🏠</Text>
          <Text style={[s.navLabel, { color: colors.primary }]}>Accueil</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.navItem} onPress={() => navigation.navigate('SearchRide')}>
          <Text style={s.navIcon}>🔍</Text>
          <Text style={s.navLabel}>Recherche</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.navItem} onPress={() => navigation.navigate('Schedule')}>
          <Text style={s.navIcon}>📅</Text>
          <Text style={s.navLabel}>Planning</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.navItem} onPress={() => navigation.navigate('Discussions')}>
          <Text style={s.navIcon}>💬</Text>
          <Text style={s.navLabel}>Messages</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.navItem} onPress={() => navigation.navigate('Profile')}>
          <Text style={s.navIcon}>👤</Text>
          <Text style={s.navLabel}>Profil</Text>
        </TouchableOpacity>
      </View>
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
  listContent: {
    paddingBottom: 85,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 36,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  headerAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  headerBonjour: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  headerUserName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifIcon: {
    fontSize: 18,
  },
  notifBadge: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  publishRoundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  publishRoundBtnText: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    lineHeight: 28,
  },
  headerQuestion: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.white,
    marginTop: 18,
    marginBottom: 16,
  },
  searchToggleBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.md,
    padding: 4,
  },
  searchYellowBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchYellowText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  publishToggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishToggleText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  statsCardsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 14,
    gap: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  statIconCircleBlue: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIconCircleYellow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 16,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  voirToutText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
  driverRating: {
    fontSize: 12,
    color: colors.warning,
    marginTop: 2,
  },
  priceBox: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.primary,
  },
  priceSub: {
    fontSize: 10,
    color: colors.textMuted,
  },
  routeBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.sm,
    padding: 10,
    marginBottom: 12,
    gap: 4,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotBlue: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginRight: 8,
  },
  dotGray: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textLight,
    marginRight: 8,
  },
  routeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  routeTextMuted: {
    fontSize: 12,
    color: colors.textMuted,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
    marginRight: 8,
  },
  tagPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  badgeMatch: {
    backgroundColor: colors.badgeMatchBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  badgeMatchText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.badgeMatchText,
  },
  btnDetails: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  btnDetailsText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    flexDirection: 'row',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    ...shadows.elevated,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navIcon: {
    fontSize: 18,
    color: colors.textMuted,
  },
  navLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
});
