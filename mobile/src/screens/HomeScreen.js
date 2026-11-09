import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import api from '../api';
import { colors, shadows } from '../theme';

export default function HomeScreen({ navigation, onLogout }) {
  const [user, setUser] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [nbNotifs, setNbNotifs] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [rafraichir, setRafraichir] = useState(false);
  const [ongletActif, setOngletActif] = useState('accueil');

  const charger = useCallback(async () => {
    try {
      const [resUser, resSugg, resNotif] = await Promise.all([
        api.get('/auth/me'),
        api.get('/rides/suggestions').catch(() => ({ data: [] })),
        api.get('/notifications').catch(() => ({ data: { nbNonLues: 0 } })),
      ]);
      setUser(resUser.data);
      setSuggestions(resSugg.data || []);
      setNbNotifs(resNotif.data?.nbNonLues || 0);
    } catch (err) {
      console.log('Erreur chargement accueil :', err);
    } finally {
      setChargement(false);
      setRafraichir(false);
    }
  }, []);

  useEffect(() => {
    charger();
    const unsubscribe = navigation.addListener('focus', charger);
    return unsubscribe;
  }, [navigation, charger]);

  if (chargement) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const prenom = user?.nom ? user.nom.split(' ')[0] : 'Étudiant';

  const confirmerDeconnexion = () => {
    Alert.alert(
      'Se déconnecter',
      'Voulez-vous vraiment vous déconnecter de votre compte UniRide ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Oui, se déconnecter',
          style: 'destructive',
          onPress: async () => {
            if (onLogout) {
              await onLogout();
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header Bar fidèle aux maquettes UniRide */}
      <View style={styles.headerBar}>
        <View style={styles.logoGroup}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoIcon}>🍃</Text>
          </View>
          <Text style={styles.logoText}>UniRide</Text>
        </View>

        <View style={styles.headerRightGroup}>
          <TouchableOpacity
            style={styles.headerNotifBtn}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.7}
          >
            <Text style={styles.headerNotifIcon}>🔔</Text>
            {nbNotifs > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{nbNotifs > 9 ? '9+' : nbNotifs}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.8}>
            {user?.photo ? (
              <Image source={{ uri: user.photo }} style={styles.headerAvatar} />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <Text style={styles.headerAvatarText}>{prenom[0]?.toUpperCase() || 'U'}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerLogoutBtn}
            onPress={confirmerDeconnexion}
            activeOpacity={0.7}
          >
            <Text style={styles.headerLogoutIcon}>⎋</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
      >
        {/* Salutation & Match IA (Image 2 de la maquette - US11) */}
        <View style={styles.greetingSection}>
          <View style={styles.greetingTextContainer}>
            <Text style={styles.greetingTitle}>Bonjour {prenom} !</Text>
            <Text style={styles.greetingSubtitle}>Où vas-tu aujourd'hui ?</Text>
          </View>

          <TouchableOpacity
            style={styles.badgeMatchIA}
            onPress={() => {
              if (suggestions.length > 0) {
                navigation.navigate('MatchingDetail', { id: suggestions[0]._id });
              } else {
                navigation.navigate('SearchRide');
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.badgeMatchIAText}>91% Match IA 📊</Text>
          </TouchableOpacity>
        </View>

        {/* Barre de recherche rapide (Style Image 2 de la maquette) */}
        <TouchableOpacity
          style={styles.searchBarCard}
          onPress={() => navigation.navigate('SearchRide')}
          activeOpacity={0.85}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchPlaceholder} numberOfLines={1}>
            Rechercher un trajet vers ISET...
          </Text>
          <View style={styles.searchButtonMini}>
            <Text style={styles.searchButtonMiniText}>Chercher</Text>
          </View>
        </TouchableOpacity>

        {/* Raccourcis Fonctionnalités / Sprint 3 */}
        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: '#F0FDF4' }]}
            onPress={() => navigation.navigate('SearchRide')}
          >
            <Text style={styles.quickCardIcon}>🔍</Text>
            <Text style={styles.quickCardTitle}>Chercher</Text>
            <Text style={styles.quickCardSub}>Trajet vers l'institut</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: '#ECFDF5' }]}
            onPress={() => navigation.navigate('MyBookings')}
          >
            <Text style={styles.quickCardIcon}>🎫</Text>
            <Text style={styles.quickCardTitle}>Réservations</Text>
            <Text style={styles.quickCardSub}>Mes places réservées</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: '#F0F9FF' }]}
            onPress={() => navigation.navigate('BookingRequests')}
          >
            <Text style={styles.quickCardIcon}>📬</Text>
            <Text style={styles.quickCardTitle}>Demandes</Text>
            <Text style={styles.quickCardSub}>Gérer les passagers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: '#FEF3C7' }]}
            onPress={() => (user?.vehicule ? navigation.navigate('PublishRide') : navigation.navigate('Vehicle'))}
          >
            <Text style={styles.quickCardIcon}>🚗</Text>
            <Text style={styles.quickCardTitle}>Publier</Text>
            <Text style={styles.quickCardSub}>
              {user?.vehicule ? 'Nouveau trajet' : 'Ajouter véhicule'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Suggestions Intelligentes (Image 1 et 2 de la maquette) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>SUGGESTIONS</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SearchRide')}>
            <Text style={styles.sectionLink}>Voir tout</Text>
          </TouchableOpacity>
        </View>

        {suggestions.length === 0 ? (
          <View style={styles.noSuggestionsCard}>
            <Text style={styles.noSuggestionsIcon}>🌱</Text>
            <Text style={styles.noSuggestionsTitle}>Aucun trajet suggéré pour le moment</Text>
            <Text style={styles.noSuggestionsSub}>
              Soyez le premier à publier un trajet ou configurez votre emploi du temps pour recevoir des
              suggestions automatiques !
            </Text>
          </View>
        ) : (
          suggestions.map((item) => {
            const conducteur = item.conducteur;
            return (
              <TouchableOpacity
                key={item._id}
                style={styles.suggestionCard}
                onPress={() => navigation.navigate('RideDetail', { id: item._id })}
                activeOpacity={0.8}
              >
                <View style={styles.suggTopRow}>
                  <View style={styles.suggDriverRow}>
                    {conducteur?.photo ? (
                      <Image source={{ uri: conducteur.photo }} style={styles.suggAvatar} />
                    ) : (
                      <View style={styles.suggAvatarPlaceholder}>
                        <Text style={styles.suggAvatarText}>
                          {conducteur?.nom ? conducteur.nom[0].toUpperCase() : 'C'}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.suggDriverName} numberOfLines={1}>
                        {conducteur?.nom}
                      </Text>
                      <Text style={styles.suggDriverSub}>
                        ⭐ {(conducteur?.noteMoyenne || 4.8).toFixed(1)} ·{' '}
                        {conducteur?.filiere || 'ISET Nabeul'}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.badgeMatchSmall}
                    onPress={() => navigation.navigate('MatchingDetail', { id: item._id })}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.badgeMatchSmallText}>{item.scoreMatch || 91}% MATCH 📊</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.suggRouteRow}>
                  <Text style={styles.suggRouteText} numberOfLines={1}>
                    {item.depart.label?.split(',')[0]} → {item.destination.label?.split(',')[0]}
                  </Text>
                  <Text style={styles.suggPriceText}>{item.prix} DT</Text>
                </View>

                <View style={styles.suggBottomRow}>
                  <Text style={styles.suggTimeText}>
                    ⏰ Départ à {item.heureDepart}
                  </Text>
                  <Text style={styles.suggPlacesText}>
                    {item.places} place(s) disponible(s)
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Emploi du temps & Profil Raccourcis */}
        <View style={styles.extraSection}>
          <TouchableOpacity
            style={styles.bannerPlanning}
            onPress={() => navigation.navigate('Schedule')}
          >
            <Text style={styles.bannerPlanningIcon}>📅</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.bannerPlanningTitre}>Mon Emploi du Temps ISET</Text>
              <Text style={styles.bannerPlanningDesc}>
                Importez votre planning pour calculer automatiquement votre compatibilité covoiturage.
              </Text>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bannerPlanning, { marginTop: 10, borderColor: '#A7F3D0', backgroundColor: '#F0FDF4' }]}
            onPress={() => navigation.navigate('Stats')}
          >
            <Text style={styles.bannerPlanningIcon}>🏆</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.bannerPlanningTitre, { color: colors.primaryDark }]}>Mes Statistiques & Badges (US16-17)</Text>
              <Text style={styles.bannerPlanningDesc}>
                Consultez vos économies en dinars, votre CO₂ évité et vos badges de valorisation.
              </Text>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Barre de navigation inférieure UniRide (Image 2 de la maquette) */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          style={styles.tabBarItem}
          onPress={() => setOngletActif('accueil')}
        >
          <Text style={[styles.tabBarIcon, ongletActif === 'accueil' && styles.tabBarIconActif]}>
            🏠
          </Text>
          <Text style={[styles.tabBarLabel, ongletActif === 'accueil' && styles.tabBarLabelActif]}>
            ACCUEIL
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabBarItem}
          onPress={() => navigation.navigate('MyRides')}
        >
          <Text style={styles.tabBarIcon}>🚗</Text>
          <Text style={styles.tabBarLabel}>TRAJETS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabBarItem}
          onPress={() => navigation.navigate('Discussions')}
        >
          <Text style={styles.tabBarIcon}>💬</Text>
          <Text style={styles.tabBarLabel}>CHAT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabBarItem}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.tabBarIcon}>👤</Text>
          <Text style={styles.tabBarLabel}>COMPTE</Text>
        </TouchableOpacity>
      </View>
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
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  logoIcon: {
    fontSize: 16,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.primaryDark,
    letterSpacing: -0.5,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  headerAvatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerNotifBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerNotifIcon: {
    fontSize: 16,
  },
  notifBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: colors.danger,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '900',
  },
  headerLogoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  headerLogoutIcon: {
    fontSize: 16,
    color: colors.danger,
    fontWeight: 'bold',
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  greetingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  greetingTextContainer: {
    flex: 1,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
  },
  greetingSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  badgeMatchIA: {
    backgroundColor: colors.badgeMatchBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  badgeMatchIAText: {
    color: colors.badgeMatchText,
    fontSize: 11,
    fontWeight: '800',
  },
  searchBarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: colors.textMuted,
  },
  searchButtonMini: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  searchButtonMiniText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quickCard: {
    width: '48%',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    ...shadows.card,
  },
  quickCardIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  quickCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  quickCardSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  noSuggestionsCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  noSuggestionsIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  noSuggestionsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  noSuggestionsSub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  suggestionCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  suggTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  suggDriverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  suggAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  suggAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  suggAvatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  suggDriverName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  suggDriverSub: {
    fontSize: 11,
    color: colors.textMuted,
  },
  badgeMatchSmall: {
    backgroundColor: colors.badgeGoldBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeMatchSmallText: {
    color: colors.badgeGoldText,
    fontSize: 10,
    fontWeight: '800',
  },
  suggRouteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  suggRouteText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  suggPriceText: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.primary,
  },
  suggBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggTimeText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  suggPlacesText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  extraSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  bannerPlanning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    ...shadows.card,
  },
  bannerPlanningIcon: {
    fontSize: 28,
  },
  bannerPlanningTitre: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  bannerPlanningDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  arrowIcon: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: 'bold',
  },
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 65,
    backgroundColor: colors.card,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingBottom: 4,
    ...shadows.capsule,
  },
  tabBarItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBarIcon: {
    fontSize: 18,
    color: colors.textMuted,
    marginBottom: 2,
  },
  tabBarIconActif: {
    color: colors.primary,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  tabBarLabelActif: {
    color: colors.primary,
    fontWeight: '900',
  },
});
