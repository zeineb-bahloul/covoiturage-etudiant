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
import { colors, shadows } from '../theme';
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

  const demarrerTrajet = (id) => {
    Alert.alert(
      'Démarrer le trajet',
      'Confirmez-vous le départ ? Les passagers ayant réservé recevront une notification en temps réel.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Oui, démarrer',
          onPress: async () => {
            try {
              await api.patch(`/rides/${id}/start`);
              navigation.navigate('ActiveRide', { id });
            } catch (err) {
              Alert.alert('Erreur', err.response?.data?.message || 'Impossible de démarrer le trajet');
            }
          },
        },
      ]
    );
  };

  const annuler = (id) => {
    Alert.alert(
      'Annuler ce trajet ?',
      'Cette action annulera également toutes les réservations associées des passagers.',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/rides/${id}`);
              setTrajets((avant) => avant.filter((t) => t._id !== id));
              Alert.alert('Succès', 'Le trajet a été annulé');
            } catch (err) {
              Alert.alert('Erreur', 'Annulation impossible');
            }
          },
        },
      ]
    );
  };

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
        title="Mes trajets publiés"
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
      >
        <Text style={styles.demandesBannerIcon}>📬</Text>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.demandesBannerTitre}>Toutes les demandes de réservation</Text>
          <Text style={styles.demandesBannerSub}>Acceptez ou refusez les passagers (Sprint 3)</Text>
        </View>
        <Text style={styles.arrowIcon}>→</Text>
      </TouchableOpacity>

      <FlatList
        data={trajets}
        keyExtractor={(t) => t._id}
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
            <Text style={styles.emptyIcon}>🚘</Text>
            <Text style={styles.emptyTitle}>Vous n'avez aucun trajet actif</Text>
            <Text style={styles.emptySub}>
              Publiez votre premier trajet vers l'ISET Nabeul pour proposer vos places libres à d'autres étudiants.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('PublishRide')}
            >
              <Text style={styles.emptyButtonText}>Publier un trajet</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const aDemandes = item.demandesEnAttente > 0;
          const estEnCours = item.statut === 'en_cours';

          return (
            <View style={[styles.card, estEnCours && styles.cardEnCours]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.routeText} numberOfLines={1}>
                    {item.depart.label?.split(',')[0]} → {item.destination.label?.split(',')[0]}
                  </Text>
                  {estEnCours && (
                    <View style={styles.enCoursBadge}>
                      <Text style={styles.enCoursBadgeText}>● EN COURS D'ACHEMINEMENT</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.prixTag}>{item.prix} DT</Text>
              </View>

              <Text style={styles.dateText}>📅 {quand(item)}</Text>
              <Text style={styles.timeText}>
                ⏰ Départ {item.heureDepart} · Arrivée vers {item.heureArrivee} ({item.distanceKm} km)
              </Text>

              <View style={styles.placesRow}>
                <Text style={styles.placesText}>
                  💺 {item.places} place(s) libre(s)
                </Text>
                {item.demandesAcceptees > 0 && (
                  <Text style={styles.placesOccupeesText}>
                    · {item.demandesAcceptees} passager(s) confirmé(s)
                  </Text>
                )}
              </View>

              {/* Bouton Démarrer / Reprendre le trajet (US21) */}
              {estEnCours ? (
                <TouchableOpacity
                  style={styles.boutonEnCoursAction}
                  onPress={() => navigation.navigate('ActiveRide', { id: item._id })}
                >
                  <Text style={styles.boutonEnCoursActionTexte}>📍 Trajet en cours · Suivre & Terminer</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.boutonDemarrerTrajet}
                  onPress={() => demarrerTrajet(item._id)}
                >
                  <Text style={styles.boutonDemarrerTrajetTexte}>🚀 Démarrer le trajet (US21)</Text>
                </TouchableOpacity>
              )}

              {/* Bouton pour gérer les demandes de ce trajet (US10) */}
              <TouchableOpacity
                style={[styles.demandesBouton, aDemandes && styles.demandesBoutonAlerte]}
                onPress={() => navigation.navigate('BookingRequests', { trajetId: item._id })}
              >
                <Text style={[styles.demandesBoutonTexte, aDemandes && styles.demandesBoutonTexteAlerte]}>
                  {aDemandes
                    ? `🔔 ${item.demandesEnAttente} nouvelle(s) demande(s) en attente !`
                    : 'Gérer les réservations'}
                </Text>
              </TouchableOpacity>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.voirBouton}
                  onPress={() => navigation.navigate('RideDetail', { id: item._id })}
                >
                  <Text style={styles.voirBoutonTexte}>Détail</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.annulerBouton} onPress={() => annuler(item._id)}>
                  <Text style={styles.annulerBoutonTexte}>Annuler le trajet</Text>
                </TouchableOpacity>
              </View>
            </View>
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
  headerAddBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    ...shadows.card,
  },
  demandesBannerIcon: {
    fontSize: 24,
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
    fontSize: 18,
    color: colors.primary,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
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
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    borderRadius: 14,
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
    borderRadius: 10,
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
  emptyButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
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
    borderRadius: 8,
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
    borderRadius: 14,
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
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  boutonDemarrerTrajetTexte: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 13,
  },
});
