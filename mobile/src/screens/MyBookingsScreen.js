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

export default function MyBookingsScreen({ navigation }) {
  const [reservations, setReservations] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [rafraichir, setRafraichir] = useState(false);
  const [actionEnCours, setActionEnCours] = useState(null);

  const charger = useCallback(async () => {
    try {
      const { data } = await api.get('/bookings/my');
      setReservations(data);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de charger vos réservations');
    } finally {
      setChargement(false);
      setRafraichir(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger])
  );

  const annuler = (id) => {
    Alert.alert('Annuler la réservation', 'Voulez-vous vraiment annuler votre place sur ce trajet ?', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui, annuler',
        style: 'destructive',
        onPress: async () => {
          setActionEnCours(id);
          try {
            await api.patch(`/bookings/${id}/cancel`);
            Alert.alert('Réservation annulée');
            charger();
          } catch (err) {
            Alert.alert('Erreur', err.response?.data?.message || 'Annulation impossible');
          } finally {
            setActionEnCours(null);
          }
        },
      },
    ]);
  };

  const badgeStatusConfig = (statut) => {
    switch (statut) {
      case 'acceptee':
        return { texte: 'Acceptée ✓', bg: colors.successLight, text: colors.success };
      case 'en_attente':
        return { texte: 'En attente ⏳', bg: colors.warningLight, text: colors.warning };
      case 'refusee':
        return { texte: 'Refusée ✕', bg: colors.dangerLight, text: colors.danger };
      case 'annulee':
        return { texte: 'Annulée', bg: '#F1F5F9', text: colors.textMuted };
      default:
        return { texte: statut, bg: colors.borderLight, text: colors.text };
    }
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
        title="Mes réservations"
        subtitle="Trajets réservés"
        navigation={navigation}
        showBack={true}
      />

      <FlatList
        data={reservations}
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
            <Text style={styles.emptyIcon}>🎫</Text>
            <Text style={styles.emptyTitle}>Aucune réservation</Text>
            <Text style={styles.emptySub}>
              Vous n'avez pas encore réservé de place. Cherchez un trajet vers l'ISET Nabeul dès maintenant !
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('SearchRide')}
            >
              <Text style={styles.emptyButtonText}>Rechercher un trajet</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const trajet = item.trajet;
          const conducteur = item.conducteur;
          const config = badgeStatusConfig(item.statut);
          const estActif = item.statut === 'en_attente' || item.statut === 'acceptee';

          return (
            <View style={styles.card}>
              <View style={styles.topCardRow}>
                <View style={[styles.badgeStatus, { backgroundColor: config.bg }]}>
                  <Text style={[styles.badgeStatusTexte, { color: config.text }]}>{config.texte}</Text>
                </View>

                {item.scoreMatch && (
                  <View style={styles.badgeMatch}>
                    <Text style={styles.badgeMatchTexte}>{item.scoreMatch}% MATCH</Text>
                  </View>
                )}
              </View>

              {/* Trajet details */}
              {trajet ? (
                <TouchableOpacity
                  onPress={() => navigation.navigate('RideDetail', { id: trajet._id })}
                  activeOpacity={0.7}
                >
                  <Text style={styles.trajetRoute}>
                    {trajet.depart?.label?.split(',')[0]} → {trajet.destination?.label?.split(',')[0]}
                  </Text>
                  <Text style={styles.trajetHoraires}>
                    ⏰ Départ à {trajet.heureDepart} · Arrivée vers {trajet.heureArrivee}
                  </Text>
                  <Text style={styles.trajetInfo}>
                    📅{' '}
                    {trajet.recurrent
                      ? `Chaque ${trajet.jours?.join(', ')}`
                      : `Le ${new Date(trajet.date).toISOString().slice(0, 10)}`}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={{ fontStyle: 'italic', color: colors.textMuted }}>Trajet archivé</Text>
              )}

              {/* Conducteur details */}
              <View style={styles.conducteurRow}>
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
                  <Text style={styles.conducteurNom}>{conducteur?.nom || 'Conducteur ISET'}</Text>
                  <Text style={styles.conducteurNote}>
                    ⭐ {(conducteur?.noteMoyenne || 4.8).toFixed(1)} / 5 ·{' '}
                    {conducteur?.vehicule?.marque || 'Véhicule'}
                  </Text>
                </View>
                <View style={styles.prixTag}>
                  <Text style={styles.prixMontant}>{(trajet?.prix || 0) * (item.places || 1)} DT</Text>
                  <Text style={styles.prixPlaces}>{item.places} place(s)</Text>
                </View>
              </View>

              {item.message ? (
                <View style={styles.messageRow}>
                  <Text style={styles.messageTexte}>Votre mot : « {item.message} »</Text>
                </View>
              ) : null}

              {/* Trajet en cours - Suivi en direct (US21) */}
              {trajet?.statut === 'en_cours' && (
                <TouchableOpacity
                  style={styles.boutonSuiviDirect}
                  onPress={() => navigation.navigate('ActiveRide', { id: trajet._id })}
                >
                  <Text style={styles.boutonSuiviDirectTexte}>🚗 Le conducteur est en route · Suivre le trajet</Text>
                </TouchableOpacity>
              )}

              {/* Trajet terminé - Possibilité de noter le conducteur (US14 & US17) */}
              {trajet?.statut === 'termine' && (
                <TouchableOpacity
                  style={styles.boutonNoterConducteur}
                  onPress={() =>
                    navigation.navigate('RateRide', {
                      trajetId: trajet._id,
                      cibleId: conducteur?._id,
                      cibleNom: conducteur?.nom,
                      ciblePhoto: conducteur?.photo,
                      roleCible: 'conducteur',
                    })
                  }
                >
                  <Text style={styles.boutonNoterConducteurTexte}>⭐ Noter ce conducteur & Badges</Text>
                </TouchableOpacity>
              )}

              {/* Actions */}
              <View style={styles.actionsRow}>
                {conducteur && (
                  <TouchableOpacity
                    style={styles.boutonChatAction}
                    onPress={() =>
                      navigation.navigate('Chat', {
                        destinataireId: conducteur._id,
                        contactNom: conducteur.nom,
                        contactPhoto: conducteur.photo,
                        contactFiliere: conducteur.filiere,
                        trajetTitre: trajet ? `${trajet.depart?.label?.split(',')[0]} → ${trajet.destination?.label?.split(',')[0]}` : '',
                      })
                    }
                  >
                    <Text style={styles.boutonChatActionTexte}>💬 Message</Text>
                  </TouchableOpacity>
                )}

                {trajet && (
                  <TouchableOpacity
                    style={styles.boutonVoir}
                    onPress={() => navigation.navigate('RideDetail', { id: trajet._id })}
                  >
                    <Text style={styles.boutonVoirTexte}>Itinéraire</Text>
                  </TouchableOpacity>
                )}

                {estActif && (
                  <TouchableOpacity
                    style={styles.boutonAnnuler}
                    onPress={() => annuler(item._id)}
                    disabled={actionEnCours === item._id}
                  >
                    {actionEnCours === item._id ? (
                      <ActivityIndicator size="small" color={colors.danger} />
                    ) : (
                      <Text style={styles.boutonAnnulerTexte}>Annuler</Text>
                    )}
                  </TouchableOpacity>
                )}
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
  topCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeStatusTexte: {
    fontSize: 12,
    fontWeight: '800',
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
  },
  trajetRoute: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  trajetHoraires: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 2,
  },
  trajetInfo: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 12,
  },
  conducteurRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  conducteurNom: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  conducteurNote: {
    fontSize: 11,
    color: colors.textMuted,
  },
  prixTag: {
    alignItems: 'flex-end',
  },
  prixMontant: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  prixPlaces: {
    fontSize: 11,
    color: colors.textMuted,
  },
  messageRow: {
    backgroundColor: '#F1F5F9',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  messageTexte: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  boutonSuiviDirect: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
    ...shadows.card,
  },
  boutonSuiviDirectTexte: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 13,
  },
  boutonNoterConducteur: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  boutonNoterConducteurTexte: {
    color: '#B45309',
    fontWeight: '800',
    fontSize: 13,
  },
  boutonChatAction: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginRight: 6,
  },
  boutonChatActionTexte: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  boutonVoir: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
  },
  boutonVoirTexte: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  boutonAnnuler: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.dangerLight,
  },
  boutonAnnulerTexte: {
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
});

