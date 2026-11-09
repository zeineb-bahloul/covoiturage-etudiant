import React, { useEffect, useState, useCallback, memo } from 'react';
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
import { colors, shadows, radius } from '../theme';

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

const DiscussionCard = memo(({ item, onOpen }) => {
  const contact = item.autreParticipant;
  const initiales = contact?.nom ? contact.nom[0].toUpperCase() : 'U';

  return (
    <TouchableOpacity
      style={[s.convCard, item.nonLu && s.convCardNonLu]}
      onPress={() => onOpen(item, contact)}
      activeOpacity={0.7}
    >
      <View style={s.avatarContainer}>
        {contact?.photo ? (
          <Image source={{ uri: contact.photo }} style={s.avatar} />
        ) : (
          <View style={s.avatarPlaceholder}>
            <Text style={s.avatarText}>{initiales}</Text>
          </View>
        )}
        <View style={s.onlineDot} />
      </View>

      <View style={s.infoContainer}>
        <View style={s.topRow}>
          <Text style={[s.contactName, item.nonLu && s.contactNameBold]} numberOfLines={1}>
            {contact?.nom || 'Covoitureur UniRide'}
          </Text>
          <Text style={s.timeText}>
            {formaterHeure(item.dernierMessage?.date || item.updatedAt)}
          </Text>
        </View>

        {item.titre ? (
          <View style={s.tripTag}>
            <Text style={s.tripTagText} numberOfLines={1}>
              🚗 {item.titre}
            </Text>
          </View>
        ) : null}

        <View style={s.bottomRow}>
          <Text
            style={[s.lastMsgText, item.nonLu && s.lastMsgTextBold]}
            numberOfLines={1}
          >
            {item.dernierMessage?.texte || 'Nouvelle discussion'}
          </Text>

          {item.nonLu && (
            <View style={s.unreadBadge}>
              <Text style={s.unreadBadgeText}>1</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function DiscussionsScreen({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [filtre, setFiltre] = useState('tous'); // 'tous', 'actifs', 'archives'
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
    const nomMatch = c.autreParticipant?.nom
      ?.toLowerCase()
      .includes(recherche.toLowerCase());
    const trajetMatch = c.titre?.toLowerCase().includes(recherche.toLowerCase());
    const dernierMsgMatch = c.dernierMessage?.texte
      ?.toLowerCase()
      .includes(recherche.toLowerCase());

    const correspondRecherche = !recherche || nomMatch || trajetMatch || dernierMsgMatch;
    if (!correspondRecherche) return false;

    if (filtre === 'actifs') return c.autreParticipant?.vehicule || c.titre;
    if (filtre === 'archives') return false;
    return true;
  });

  const handleOpen = useCallback((item, contact) => {
    navigation.navigate('Chat', {
      conversationId: item._id,
      contactNom: contact?.nom || 'Covoitureur',
      contactPhoto: contact?.photo,
      contactFiliere: contact?.filiere,
      trajetTitre: item.titre,
    });
  }, [navigation]);

  const renderItem = useCallback(({ item }) => (
    <DiscussionCard item={item} onOpen={handleOpen} />
  ), [handleOpen]);

  return (
    <View style={s.container}>
      <UniHeader
        title="Messages"
        subtitle="Discussions & Covoiturages"
        onBack={() => navigation.navigate('Home')}
        showBack={true}
      />

      {/* ─── Barre de Recherche ─── */}
      <View style={s.searchContainer}>
        <View style={s.searchBox}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            style={s.searchInput}
            placeholder="Rechercher une conversation, un trajet..."
            placeholderTextColor="#94A3B8"
            value={recherche}
            onChangeText={setRecherche}
          />
          {recherche ? (
            <TouchableOpacity onPress={() => setRecherche('')}>
              <Text style={s.clearIcon}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ─── Onglets Filtres (Page 10 PDF) ─── */}
      <View style={s.tabsContainer}>
        {[
          { cle: 'tous', label: 'Tous' },
          { cle: 'actifs', label: 'Trajets Actifs' },
          { cle: 'archives', label: 'Archives' },
        ].map((tab) => {
          const isActive = filtre === tab.cle;
          return (
            <TouchableOpacity
              key={tab.cle}
              style={[s.tabPill, isActive && s.tabPillActive]}
              onPress={() => setFiltre(tab.cle)}
              activeOpacity={0.8}
            >
              <Text style={[s.tabPillText, isActive && s.tabPillTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ─── Liste des Conversations ─── */}
      {chargement ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={conversationsFiltrees}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
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
            <View style={s.emptyContainer}>
              <Text style={s.emptyIcon}>💬</Text>
              <Text style={s.emptyTitle}>Aucun message</Text>
              <Text style={s.emptySubtitle}>
                {recherche
                  ? 'Aucune conversation trouvée pour cette recherche.'
                  : 'Contactez un conducteur depuis un trajet pour commencer une discussion.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.card,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  clearIcon: {
    color: '#94A3B8',
    fontSize: 14,
    paddingHorizontal: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  convCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    ...shadows.card,
  },
  convCardNonLu: {
    backgroundColor: '#F8FAFC',
    borderColor: '#BFDBFE',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  infoContainer: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  contactNameBold: {
    fontWeight: '800',
  },
  timeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginLeft: 8,
  },
  tripTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginVertical: 4,
  },
  tripTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  lastMsgText: {
    fontSize: 13,
    color: '#64748B',
    flex: 1,
  },
  lastMsgTextBold: {
    color: '#0F172A',
    fontWeight: '700',
  },
  unreadBadge: {
    backgroundColor: colors.accent,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: colors.navy,
    fontSize: 11,
    fontWeight: '900',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 30,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
