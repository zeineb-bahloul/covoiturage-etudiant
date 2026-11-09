import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api';
import { colors, shadows } from '../theme';
import UniHeader from '../components/UniHeader';

export default function BookingRequestsScreen({ route, navigation }) {
  const trajetId = route.params?.trajetId;
  const [demandes, setDemandes] = useState([]);
  const [onglet, setOnglet] = useState('en_attente'); // 'en_attente' | 'acceptee' | 'refusee'
  const [chargement, setChargement] = useState(true);
  const [actionEnCours, setActionEnCours] = useState(null);
  const [rafraichir, setRafraichir] = useState(false);

  const charger = useCallback(async () => {
    try {
      const params = trajetId ? { trajetId } : {};
      const { data } = await api.get('/bookings/requests', { params });
      setDemandes(data);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de charger les demandes de réservation');
    } finally {
      setChargement(false);
      setRafraichir(false);
    }
  }, [trajetId]);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger])
  );

  const accepter = async (id) => {
    setActionEnCours(id);
    try {
      await api.patch(`/bookings/${id}/accept`);
      Alert.alert('Succès', 'Demande de réservation acceptée !');
      charger();
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message || "Impossible d'accepter la demande");
    } finally {
      setActionEnCours(null);
    }
  };

  const refuser = (id) => {
    Alert.alert('Refuser la demande', 'Êtes-vous sûr de vouloir refuser cette réservation ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Oui, refuser',
        style: 'destructive',
        onPress: async () => {
          setActionEnCours(id);
          try {
            await api.patch(`/bookings/${id}/refuse`);
            charger();
          } catch (err) {
            Alert.alert('Erreur', err.response?.data?.message || 'Action impossible');
          } finally {
            setActionEnCours(null);
          }
        },
      },
    ]);
  };

  const demandesFiltrees = demandes.filter((d) => d.statut === onglet);

  const nbEnAttente = demandes.filter((d) => d.statut === 'en_attente').length;
  const nbAcceptees = demandes.filter((d) => d.statut === 'acceptee').length;
  const nbRefusees = demandes.filter((d) => d.statut === 'refusee').length;

  // Calcul des statistiques pour la capsule du bas
  const totalGains = demandes
    .filter((d) => d.statut === 'acceptee')
    .reduce((somme, d) => somme + (d.trajet?.prix || 0) * (d.places || 1), 0);

  const totalPlacesPrises = nbAcceptees;

  if (chargement) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <UniHeader
        title="Demandes de réservation"
        subtitle="Gestion des passagers"
        navigation={navigation}
        showBack={true}
      />

      {/* Onglets Filtres Pills (Image 3 de la maquette) */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabPill, onglet === 'en_attente' && styles.tabPillActif]}
          onPress={() => setOnglet('en_attente')}
        >
          <Text style={[styles.tabTexte, onglet === 'en_attente' && styles.tabTexteActif]}>
            En attente ({nbEnAttente})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabPill, onglet === 'acceptee' && styles.tabPillActif]}
          onPress={() => setOnglet('acceptee')}
        >
          <Text style={[styles.tabTexte, onglet === 'acceptee' && styles.tabTexteActif]}>
            Acceptées ({nbAcceptees})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabPill, onglet === 'refusee' && styles.tabPillActif]}
          onPress={() => setOnglet('refusee')}
        >
          <Text style={[styles.tabTexte, onglet === 'refusee' && styles.tabTexteActif]}>
            Refusées ({nbRefusees})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={demandesFiltrees}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
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
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🚗</Text>
            <Text style={styles.emptyTitle}>Aucune demande {onglet === 'en_attente' ? 'en attente' : onglet}</Text>
            <Text style={styles.emptySub}>
              {onglet === 'en_attente'
                ? 'Les réservations de vos passagers apparaîtront ici dès qu’ils réserveront une place.'
                : 'Historique des demandes classées.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const passager = item.passager;
          const trajet = item.trajet;
          const estEnCours = actionEnCours === item._id;

          return (
            <View style={styles.card}>
              {/* Entête du trajet */}
              {trajet && (
                <View style={styles.trajetHeader}>
                  <Text style={styles.trajetTitre} numberOfLines={1}>
                    TRAJET : {trajet.depart?.label?.split(',')[0]} → {trajet.destination?.label?.split(',')[0]} (
                    {trajet.heureDepart})
                  </Text>
                  <Text style={styles.trajetPrix}>{trajet.prix} DT</Text>
                </View>
              )}

              {/* Infos Passager */}
              <View style={styles.passengerRow}>
                {passager?.photo ? (
                  <Image source={{ uri: passager.photo }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{passager?.nom ? passager.nom[0].toUpperCase() : 'P'}</Text>
                  </View>
                )}

                <View style={styles.passengerInfo}>
                  <View style={styles.nameMatchRow}>
                    <Text style={styles.passengerName} numberOfLines={1}>
                      {passager?.nom || 'Étudiant'}
                    </Text>
                    <View style={styles.badgeMatch}>
                      <Text style={styles.badgeMatchTexte}>{item.scoreMatch || 91}% MATCH</Text>
                    </View>
                  </View>

                  <Text style={styles.filiereText} numberOfLines={1}>
                    🎓 {passager?.filiere || 'Étudiant ISET Nabeul'}
                  </Text>

                  <Text style={styles.placesDemandees}>
                    Nombre de places demandées : <Text style={{ fontWeight: 'bold' }}>{item.places}</Text>
                  </Text>
                </View>
              </View>

              {/* Bulle de citation / Message passager */}
              {item.message ? (
                <View style={styles.quoteBubble}>
                  <Text style={styles.quoteText}>“{item.message}”</Text>
                </View>
              ) : null}

              {/* Boutons d'action Refuser / Accepter (Style fidèle à l'image 3) */}
              {item.statut === 'en_attente' && (
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={styles.boutonRefuser}
                    onPress={() => refuser(item._id)}
                    disabled={estEnCours}
                  >
                    <Text style={styles.boutonRefuserTexte}>Refuser</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.boutonAccepter}
                    onPress={() => accepter(item._id)}
                    disabled={estEnCours}
                  >
                    {estEnCours ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Text style={styles.boutonAccepterTexte}>Accepter</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {item.statut === 'acceptee' && (
                <View style={styles.statusConfirmRow}>
                  <Text style={styles.statusConfirmTexte}>✓ Demande acceptée (Place réservée)</Text>
                  <TouchableOpacity onPress={() => refuser(item._id)}>
                    <Text style={styles.annulerLien}>Annuler</Text>
                  </TouchableOpacity>
                </View>
              )}

              {item.statut === 'refusee' && (
                <View style={styles.statusRefuseRow}>
                  <Text style={styles.statusRefuseTexte}>✕ Demande déclinée</Text>
                </View>
              )}
            </View>
          );
        }}
      />

      {/* Capsule d'information flottante (Image 3 de la maquette) */}
      <View style={styles.darkCapsuleBar}>
        <View style={styles.capsuleItem}>
          <Text style={styles.capsuleLabel}>ACCEPTÉES</Text>
          <Text style={styles.capsuleValeur}>{totalPlacesPrises} PASSAGER(S)</Text>
        </View>
        <View style={styles.capsuleDivider} />
        <View style={styles.capsuleItem}>
          <Text style={styles.capsuleLabel}>GAINS ESTIMÉS</Text>
          <Text style={styles.capsuleValeur}>{totalGains.toFixed(1)} DT</Text>
        </View>
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
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    justifyContent: 'space-between',
  },
  tabPill: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabPillActif: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabTexte: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  tabTexteActif: {
    color: colors.white,
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
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
  trajetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  trajetTitre: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 0.5,
    flex: 1,
  },
  trajetPrix: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    marginLeft: 8,
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
    backgroundColor: colors.borderLight,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  passengerInfo: {
    flex: 1,
  },
  nameMatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  badgeMatch: {
    backgroundColor: colors.badgeGoldBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeMatchTexte: {
    color: colors.badgeGoldText,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  filiereText: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 2,
  },
  placesDemandees: {
    fontSize: 12,
    color: colors.text,
  },
  quoteBubble: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  quoteText: {
    fontSize: 13,
    color: colors.text,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    marginTop: 16,
    alignItems: 'center',
  },
  boutonRefuser: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 10,
  },
  boutonRefuserTexte: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 14,
  },
  boutonAccepter: {
    flex: 2,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.primary,
    ...shadows.card,
  },
  boutonAccepterTexte: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  statusConfirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    padding: 12,
    borderRadius: 14,
    marginTop: 14,
  },
  statusConfirmTexte: {
    color: colors.success,
    fontWeight: '700',
    fontSize: 13,
  },
  annulerLien: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  statusRefuseRow: {
    backgroundColor: colors.dangerLight,
    padding: 10,
    borderRadius: 14,
    marginTop: 12,
    alignItems: 'center',
  },
  statusRefuseTexte: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  darkCapsuleBar: {
    position: 'absolute',
    bottom: 16,
    left: 20,
    right: 20,
    backgroundColor: colors.darkCapsule,
    borderRadius: 30,
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
    ...shadows.capsule,
  },
  capsuleItem: {
    alignItems: 'center',
  },
  capsuleLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textLight,
    letterSpacing: 0.6,
  },
  capsuleValeur: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.white,
    marginTop: 2,
  },
  capsuleDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});

