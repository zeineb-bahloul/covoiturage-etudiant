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
import { colors, shadows, radius } from '../theme';
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
      Alert.alert('Erreur', 'Impossible de charger les demandes de r\u00e9servation');
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

  const accepter = useCallback(async (id) => {
    setActionEnCours(id);
    try {
      await api.patch(`/bookings/${id}/accept`);
      Alert.alert('Succ\u00e8s', 'Demande de r\u00e9servation accept\u00e9e !');
      charger();
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message || "Impossible d'accepter la demande");
    } finally {
      setActionEnCours(null);
    }
  }, [charger]);

  const refuser = useCallback((id) => {
    Alert.alert('Refuser la demande', '\u00cates-vous s\u00fbr de vouloir refuser cette r\u00e9servation ?', [
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
  }, [charger]);

  const demandesFiltrees = demandes.filter((d) => d.statut === onglet);
  const nbEnAttente = demandes.filter((d) => d.statut === 'en_attente').length;
  const nbAcceptees = demandes.filter((d) => d.statut === 'acceptee').length;
  const nbRefusees = demandes.filter((d) => d.statut === 'refusee').length;

  const totalGains = demandes
    .filter((d) => d.statut === 'acceptee')
    .reduce((somme, d) => somme + (d.trajet?.prix || 0) * (d.places || 1), 0);

  const renderItem = useCallback(({ item }) => {
    const passager = item.passager;
    const trajet = item.trajet;
    const estEnCours = actionEnCours === item._id;

    return (
      <View style={styles.card}>
        {/* En-t\u00eate trajet */}
        {trajet && (
          <View style={styles.trajetHeader}>
            <Text style={styles.trajetTitre} numberOfLines={1}>
              TRAJET : {trajet.depart?.label?.split(',')[0]} \u2192 {trajet.destination?.label?.split(',')[0]} ({trajet.heureDepart})
            </Text>
            <Text style={styles.trajetPrix}>{trajet.prix} DT</Text>
          </View>
        )}

        {/* Info passager */}
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
                {passager?.nom || '\u00c9tudiant'}
              </Text>
              <View style={styles.badgeMatch}>
                <Text style={styles.badgeMatchTexte}>{item.scoreMatch || 91}% MATCH</Text>
              </View>
            </View>

            <Text style={styles.filiereText} numberOfLines={1}>
              {passager?.filiere || 'ISET Nabeul'}
            </Text>

            <Text style={styles.placesDemandees}>
              Places : <Text style={{ fontWeight: 'bold' }}>{item.places}</Text>
            </Text>
          </View>
        </View>

        {/* Bulle message */}
        {item.message ? (
          <View style={styles.quoteBubble}>
            <Text style={styles.quoteText}>\u201C{item.message}\u201D</Text>
          </View>
        ) : null}

        {/* Actions selon statut */}
        {item.statut === 'en_attente' && (
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.boutonRefuser}
              onPress={() => refuser(item._id)}
              disabled={estEnCours}
              activeOpacity={0.7}
            >
              <Text style={styles.boutonRefuserTexte}>Refuser</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.boutonAccepter}
              onPress={() => accepter(item._id)}
              disabled={estEnCours}
              activeOpacity={0.85}
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
          <View style={{ marginTop: 10 }}>
            <View style={styles.statusConfirmRow}>
              <Text style={styles.statusConfirmTexte}>Place confirm\u00e9e</Text>
              <TouchableOpacity onPress={() => refuser(item._id)}>
                <Text style={styles.annulerLien}>Annuler</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.boutonContacterPassager}
              onPress={() =>
                navigation.navigate('Chat', {
                  destinataireId: passager?._id,
                  contactNom: passager?.nom,
                  contactPhoto: passager?.photo,
                  contactFiliere: passager?.filiere,
                  trajetTitre: trajet ? `${trajet.depart?.label?.split(',')[0]} \u2192 ${trajet.destination?.label?.split(',')[0]}` : '',
                })
              }
              activeOpacity={0.8}
            >
              <Text style={styles.boutonContacterPassagerTexte}>
                Discuter avec le passager
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {item.statut === 'refusee' && (
          <View style={styles.statusRefuseRow}>
            <Text style={styles.statusRefuseTexte}>Demande d\u00e9clin\u00e9e</Text>
          </View>
        )}
      </View>
    );
  }, [actionEnCours, refuser, accepter, navigation]);

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
        title="Demandes de r\u00e9servation"
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
            Accept\u00e9es ({nbAcceptees})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabPill, onglet === 'refusee' && styles.tabPillActif]}
          onPress={() => setOnglet('refusee')}
        >
          <Text style={[styles.tabTexte, onglet === 'refusee' && styles.tabTexteActif]}>
            Refus\u00e9es ({nbRefusees})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={demandesFiltrees}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
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
            <View style={styles.emptyIconBox}>
              <Text style={styles.emptyIconText}>\u2022</Text>
            </View>
            <Text style={styles.emptyTitle}>
              Aucune demande {onglet === 'en_attente' ? 'en attente' : onglet}
            </Text>
            <Text style={styles.emptySub}>
              {onglet === 'en_attente'
                ? 'Les r\u00e9servations de vos passagers appara\u00eetront ici.'
                : 'Historique des demandes class\u00e9es.'}
            </Text>
          </View>
        }
      />

      {/* Capsule d'information flottante (Image 3 de la maquette) */}
      <View style={styles.darkCapsuleBar}>
        <View style={styles.capsuleItem}>
          <Text style={styles.capsuleLabel}>PLACES LIBRES</Text>
          <Text style={styles.capsuleValeur}>{nbAcceptees} OCCUP\u00c9E(S)</Text>
        </View>
        <View style={styles.capsuleDivider} />
        <View style={styles.capsuleItem}>
          <Text style={styles.capsuleLabel}>GAINS ESTIM\u00c9S</Text>
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
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: 8,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.inputBg,
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
    fontSize: 12,
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
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  trajetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    marginBottom: 10,
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
    fontWeight: '900',
    color: colors.primary,
    marginLeft: 8,
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
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
    marginBottom: 2,
  },
  passengerName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  badgeMatch: {
    backgroundColor: colors.badgeGoldBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  badgeMatchTexte: {
    color: colors.badgeGoldText,
    fontSize: 11,
    fontWeight: '800',
  },
  filiereText: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 2,
  },
  placesDemandees: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  quoteBubble: {
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    padding: 10,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  quoteText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    marginTop: 14,
    alignItems: 'center',
    gap: 10,
  },
  boutonRefuser: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  boutonRefuserTexte: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 14,
  },
  boutonAccepter: {
    flex: 2,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
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
    padding: 10,
    borderRadius: radius.md,
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
    borderRadius: radius.md,
    marginTop: 10,
    alignItems: 'center',
  },
  statusRefuseTexte: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 13,
  },
  boutonContacterPassager: {
    backgroundColor: colors.primaryLight,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: 8,
  },
  boutonContacterPassagerTexte: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyIconText: {
    fontSize: 24,
    color: colors.primary,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
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
    paddingVertical: 12,
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
    fontSize: 13,
    fontWeight: '900',
    color: colors.white,
    marginTop: 2,
  },
  capsuleDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});
