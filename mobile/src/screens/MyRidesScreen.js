import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api';
import { colors, shadows, radius } from '../theme';
import UniHeader from '../components/UniHeader';

function quand(trajet) {
  if (trajet.recurrent) {
    return `Chaque ${trajet.jours.join(', ')}`;
  }
  return `Le ${new Date(trajet.date).toISOString().slice(0, 10)}`;
}

export default function MyRidesScreen({ navigation }) {
  const [trajets, setTrajets] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [rafraichir, setRafraichir] = useState(false);

  const charger = useCallback(() => {
    api
      .get('/rides/mine')
      .then(({ data }) => setTrajets(data))
      .catch(() => Alert.alert('Erreur', 'Impossible de charger vos trajets'))
      .finally(() => {
        setChargement(false);
        setRafraichir(false);
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger])
  );

  const demarrerTrajet = useCallback((id) => {
    Alert.alert(
      'D\u00e9marrer le trajet',
      'Confirmez-vous le d\u00e9part ? Les passagers ayant r\u00e9serv\u00e9 recevront une notification en temps r\u00e9el.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Oui, d\u00e9marrer',
          onPress: async () => {
            try {
              await api.patch(`/rides/${id}/start`);
              navigation.navigate('ActiveRide', { id });
            } catch (err) {
              Alert.alert('Erreur', err.response?.data?.message || 'Impossible de d\u00e9marrer le trajet');
            }
          },
        },
      ]
    );
  }, [navigation]);

  const annuler = useCallback((id) => {
    Alert.alert(
      'Annuler ce trajet ?',
      'Cette action annulera \u00e9galement toutes les r\u00e9servations associ\u00e9es des passagers.',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/rides/${id}`);
              setTrajets((avant) => avant.filter((t) => t._id !== id));
              Alert.alert('Succ\u00e8s', 'Le trajet a \u00e9t\u00e9 annul\u00e9');
            } catch (err) {
              Alert.alert('Erreur', 'Annulation impossible');
            }
          },
        },
      ]
    );
  }, []);

  const renderItem = useCallback(({ item }) => {
    const aDemandes = item.demandesEnAttente > 0;
    const estEnCours = item.statut === 'en_cours';

    return (
      <View style={[styles.card, estEnCours && styles.cardEnCours]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.routeText} numberOfLines={1}>
              {item.depart.label?.split(',')[0]} \u2192 {item.destination.label?.split(',')[0]}
            </Text>
            {estEnCours && (
              <View style={styles.enCoursBadge}>
                <Text style={styles.enCoursBadgeText}>EN COURS D'ACHEMINEMENT</Text>
              </View>
            )}
          </View>
          <Text style={styles.prixTag}>{item.prix} DT</Text>
        </View>

        <Text style={styles.dateText}>{quand(item)}</Text>
        <Text style={styles.timeText}>
          D\u00e9part {item.heureDepart} \u00b7 Arriv\u00e9e vers {item.heureArrivee} ({item.distanceKm} km)
        </Text>

        <View style={styles.placesRow}>
          <Text style={styles.placesText}>
            {item.places} place(s) libre(s)
          </Text>
          {item.demandesAcceptees > 0 && (
            <Text style={styles.placesOccupeesText}>
              \u00b7 {item.demandesAcceptees} passager(s) confirm\u00e9(s)
            </Text>
          )}
        </View>

        {estEnCours ? (
          <TouchableOpacity
            style={styles.boutonEnCoursAction}
            onPress={() => navigation.navigate('ActiveRide', { id: item._id })}
            activeOpacity={0.85}
          >
            <Text style={styles.boutonEnCoursActionTexte}>Trajet en cours \u00b7 Suivre & Terminer</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.boutonDemarrerTrajet}
            onPress={() => demarrerTrajet(item._id)}
            activeOpacity={0.85}
          >
            <Text style={styles.boutonDemarrerTrajetTexte}>D\u00e9marrer le trajet</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.demandesBouton, aDemandes && styles.demandesBoutonAlerte]}
          onPress={() => navigation.navigate('BookingRequests', { trajetId: item._id })}
          activeOpacity={0.8}
        >
          <Text style={[styles.demandesBoutonTexte, aDemandes && styles.demandesBoutonTexteAlerte]}>
            {aDemandes
              ? `${item.demandesEnAttente} nouvelle(s) demande(s) en attente !`
              : 'G\u00e9rer les r\u00e9servations'}
          </Text>
        </TouchableOpacity>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.voirBouton}
            onPress={() => navigation.navigate('RideDetail', { id: item._id })}
          >
            <Text style={styles.voirBoutonTexte}>D\u00e9tail</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.annulerBouton} onPress={() => annuler(item._id)}>
            <Text style={styles.annulerBoutonTexte}>Annuler le trajet</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [demarrerTrajet, annuler, navigation]);

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
        title="Mes trajets publi\u00e9s"
        subtitle="Espace Conducteur"
        navigation={navigation}
        showBack={true}
        rightComponent={
          <TouchableOpacity
            style={styles.headerAddBtn}
            onPress={() => navigation.navigate('PublishRide')}
          >
            <Text style={styles.headerAddText}>+ Publier</Text>
          </TouchableOpacity>
        }
      />

      {/* Raccourci vers toutes les demandes */}
      <TouchableOpacity
        style={styles.demandesBanner}
        onPress={() => navigation.navigate('BookingRequests')}
        activeOpacity={0.8}
      >
        <View style={styles.bannerIconBox}>
          <Text style={styles.bannerIconLetter}>P</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.demandesBannerTitre}>Demandes de r\u00e9servation</Text>
          <Text style={styles.demandesBannerSub}>Acceptez ou refusez les passagers</Text>
        </View>
        <Text style={styles.arrowIcon}>\u203A</Text>
      </TouchableOpacity>

      <FlatList
        data={trajets}
        keyExtractor={(t) => t._id}
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
              <Text style={styles.emptyIconText}>+</Text>
            </View>
            <Text style={styles.emptyTitle}>Vous n'avez aucun trajet actif</Text>
            <Text style={styles.emptySub}>
              Publiez votre premier trajet vers l'ISET Nabeul pour proposer vos places libres \u00e0 d'autres \u00e9tudiants.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('PublishRide')}
            >
              <Text style={styles.emptyButtonText}>Publier un trajet</Text>
            </TouchableOpacity>
          </View>
        }
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
  headerAddBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  headerAddText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
  demandesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    ...shadows.card,
  },
  bannerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerIconLetter: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.primary,
  },
  demandesBannerTitre: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  demandesBannerSub: {
    fontSize: 12,
    color: colors.textMuted,
  },
  arrowIcon: {
    fontSize: 22,
    color: colors.primary,
    fontWeight: '300',
  },
  listContent: {
    padding: 16,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  prixTag: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.primary,
  },
  dateText: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: '600',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 8,
  },
  placesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  placesText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  placesOccupeesText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  demandesBouton: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: 10,
  },
  demandesBoutonAlerte: {
    backgroundColor: colors.badgeGoldBg,
    borderColor: '#FDE047',
  },
  demandesBoutonTexte: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  demandesBoutonTexteAlerte: {
    color: colors.badgeGoldText,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 10,
  },
  voirBouton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
  },
  voirBoutonTexte: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  annulerBouton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  annulerBoutonTexte: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyIconText: {
    fontSize: 28,
    color: colors.primary,
    fontWeight: 'bold',
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
  emptyButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radius.full,
    ...shadows.card,
  },
  emptyButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  cardEnCours: {
    borderColor: '#86EFAC',
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
  },
  enCoursBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  enCoursBadgeText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  boutonEnCoursAction: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: 10,
    ...shadows.card,
  },
  boutonEnCoursActionTexte: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 13,
  },
  boutonDemarrerTrajet: {
    backgroundColor: colors.primaryDark,
    paddingVertical: 11,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: 10,
  },
  boutonDemarrerTrajetTexte: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 13,
  },
});
