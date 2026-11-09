import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import api from '../api';
import UniHeader from '../components/UniHeader';
import { colors, shadows } from '../theme';

export default function DiscussionsScreen({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [filtre, setFiltre] = useState('tous'); // 'tous', 'trajets', 'non_lus'
  const [recherche, setRecherche] = useState('');
  const [chargement, setChargement] = useState(true);
  const [rafraichir, setRafraichir] = useState(false);

  const chargerConversations = useCallback(async () => {
    try {
      const res = await api.get('/conversations');
      setConversations(res.data || []);
    } catch (err) {
      console.log('Erreur chargement conversations :', err);
    } finally {
      setChargement(false);
      setRafraichir(false);
    }
  }, []);

  useEffect(() => {
    chargerConversations();
    const unsubscribe = navigation.addListener('focus', chargerConversations);
    return unsubscribe;
  }, [navigation, chargerConversations]);

  const conversationsFiltrees = conversations.filter((c) => {
    // Filtre de recherche
    const nomMatch = c.autreParticipant?.nom
      ?.toLowerCase()
      .includes(recherche.toLowerCase());
    const trajetMatch = c.titre?.toLowerCase().includes(recherche.toLowerCase());
    const dernierMsgMatch = c.dernierMessage?.texte
      ?.toLowerCase()
      .includes(recherche.toLowerCase());

    const correspondRecherche = !recherche || nomMatch || trajetMatch || dernierMsgMatch;

    if (!correspondRecherche) return false;

    if (filtre === 'non_lus') return c.nonLu;
    if (filtre === 'trajets') return !!c.trajet;
    return true;
  });

  const formaterHeure = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const mnt = new Date();
    const estAujourdhui = d.toDateString() === mnt.toDateString();
    if (estAujourdhui) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  };

  const renderItem = ({ item }) => {
    const contact = item.autreParticipant;
    const initiales = contact?.nom ? contact.nom[0].toUpperCase() : 'U';

    return (
      <TouchableOpacity
        style={[styles.convCard, item.nonLu && styles.convCardNonLu]}
        onPress={() =>
          navigation.navigate('Chat', {
            conversationId: item._id,
            contactNom: contact?.nom || 'Covoitureur',
            contactPhoto: contact?.photo,
            contactFiliere: contact?.filiere,
            trajetTitre: item.titre,
          })
        }
        activeOpacity={0.7}
      >
        <View style={styles.avatarConteneur}>
          {contact?.photo ? (
            <Image source={{ uri: contact.photo }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarTexte}>{initiales}</Text>
            </View>
          )}
          <View style={styles.pastilleEnLigne} />
        </View>

        <View style={styles.infoConteneur}>
          <View style={styles.titreLigne}>
            <Text style={[styles.nomContact, item.nonLu && styles.texteGras]} numberOfLines={1}>
              {contact?.nom || 'Covoitureur UniRide'}
            </Text>
            <Text style={styles.heureTexte}>
              {formaterHeure(item.dernierMessage?.date || item.updatedAt)}
            </Text>
          </View>

          {item.titre ? (
            <View style={styles.trajetPill}>
              <Text style={styles.trajetPillTexte} numberOfLines={1}>
                🚗 {item.titre}
              </Text>
            </View>
          ) : null}

          <View style={styles.dernierMsgLigne}>
            <Text
              style={[
                styles.dernierMsgTexte,
                item.nonLu && styles.dernierMsgTexteNonLu,
              ]}
              numberOfLines={1}
            >
              {item.dernierMessage?.texte || 'Nouvelle discussion'}
            </Text>

            {item.nonLu && (
              <View style={styles.badgeNonLu}>
                <Text style={styles.badgeNonLuTexte}>1</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <UniHeader
        titre="Discussions"
        sousTitre="Échangez avec vos covoitureurs"
        onBack={() => navigation.navigate('Home')}
      />

      {/* Barre de recherche */}
      <View style={styles.rechercheConteneur}>
        <View style={styles.rechercheBarre}>
          <Text style={styles.rechercheIcone}>🔍</Text>
          <TextInput
            style={styles.rechercheInput}
            placeholder="Rechercher une discussion..."
            placeholderTextColor={colors.textLight}
            value={recherche}
            onChangeText={setRecherche}
          />
          {recherche ? (
            <TouchableOpacity onPress={() => setRecherche('')}>
              <Text style={styles.effacerIcone}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Onglets de filtre (Tous, Trajets, Non lus) */}
      <View style={styles.filtresBarre}>
        <TouchableOpacity
          style={[styles.filtreBouton, filtre === 'tous' && styles.filtreBoutonActif]}
          onPress={() => setFiltre('tous')}
        >
          <Text style={[styles.filtreTexte, filtre === 'tous' && styles.filtreTexteActif]}>
            Tous
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filtreBouton, filtre === 'trajets' && styles.filtreBoutonActif]}
          onPress={() => setFiltre('trajets')}
        >
          <Text style={[styles.filtreTexte, filtre === 'trajets' && styles.filtreTexteActif]}>
            Trajets
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filtreBouton, filtre === 'non_lus' && styles.filtreBoutonActif]}
          onPress={() => setFiltre('non_lus')}
        >
          <Text style={[styles.filtreTexte, filtre === 'non_lus' && styles.filtreTexteActif]}>
            Non lus
          </Text>
        </TouchableOpacity>
      </View>

      {/* Liste des discussions */}
      {chargement ? (
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={conversationsFiltrees}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listeConteneur}
          refreshControl={
            <RefreshControl
              refreshing={rafraichir}
              onRefresh={() => {
                setRafraichir(true);
                chargerConversations();
              }}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.videConteneur}>
              <Text style={styles.videIcone}>💬</Text>
              <Text style={styles.videTitre}>Aucune discussion</Text>
              <Text style={styles.videSousTitre}>
                Vos échanges avec les conducteurs et passagers apparaîtront ici pour convenir de vos points de rendez-vous.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centre: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rechercheConteneur: {
    paddingHorizontal: 20,
    marginTop: -16,
    marginBottom: 10,
  },
  rechercheBarre: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...shadows.card,
  },
  rechercheIcone: {
    fontSize: 16,
    marginRight: 8,
  },
  rechercheInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  effacerIcone: {
    fontSize: 14,
    color: colors.textLight,
    paddingHorizontal: 6,
  },
  filtresBarre: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  filtreBouton: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  filtreBoutonActif: {
    backgroundColor: colors.primary,
  },
  filtreTexte: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filtreTexteActif: {
    color: colors.white,
    fontWeight: '700',
  },
  listeConteneur: {
    paddingHorizontal: 20,
    paddingBottom: 25,
  },
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    ...shadows.card,
  },
  convCardNonLu: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  avatarConteneur: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTexte: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  pastilleEnLigne: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: colors.card,
  },
  infoConteneur: {
    flex: 1,
  },
  titreLigne: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  nomContact: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  texteGras: {
    fontWeight: '800',
    color: colors.text,
  },
  heureTexte: {
    fontSize: 11,
    color: colors.textLight,
    marginLeft: 8,
  },
  trajetPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  trajetPillTexte: {
    fontSize: 11,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  dernierMsgLigne: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dernierMsgTexte: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  dernierMsgTexteNonLu: {
    color: colors.text,
    fontWeight: '700',
  },
  badgeNonLu: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  badgeNonLuTexte: {
    color: colors.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  videConteneur: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 30,
  },
  videIcone: {
    fontSize: 50,
    marginBottom: 14,
  },
  videTitre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  videSousTitre: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

