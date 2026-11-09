import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import api from '../api';
import { colors, shadows, radius } from '../theme';

export default function ChatScreen({ route, navigation }) {
  const {
    conversationId: initialConvId,
    destinataireId,
    contactNom = 'Covoitureur',
    contactPhoto,
    contactFiliere = 'Étudiant ISET',
    trajetTitre,
  } = route.params || {};

  const [conversationId, setConversationId] = useState(initialConvId || null);
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [monId, setMonId] = useState(null);

  const flatListRef = useRef(null);

  const suggestionsRapides = [
    'Je suis au point de rendez-vous 👋',
    'J’arrive dans 5 minutes 🚗',
    'Tout est bon pour l’horaire ?',
    'Merci beaucoup !',
  ];

  useEffect(() => {
    let intervalId;

    const initialiser = async () => {
      try {
        const resMe = await api.get('/auth/me');
        setMonId(resMe.data?._id);

        let convId = initialConvId;
        if (!convId && destinataireId) {
          const resConv = await api.post('/conversations', {
            destinataireId,
            titre: trajetTitre,
          });
          convId = resConv.data?._id;
          setConversationId(convId);
        }

        if (convId) {
          const resMsg = await api.get(`/conversations/${convId}/messages`);
          setMessages(resMsg.data || []);
        }
      } catch (err) {
        console.log('Erreur init chat :', err);
      } finally {
        setChargement(false);
      }
    };

    initialiser();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [initialConvId, destinataireId, trajetTitre]);

  // Polling automatique
  useEffect(() => {
    if (!conversationId) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/conversations/${conversationId}/messages`);
        if (Array.isArray(res.data)) {
          setMessages(res.data);
        }
      } catch (e) {
        // Ignorer silencieusement les erreurs périodiques
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [conversationId]);

  const envoyerMessage = useCallback(async (texteAEnvoyer = null) => {
    const contenu = (texteAEnvoyer || texte).trim();
    if (!contenu) return;

    setEnvoiEnCours(true);
    try {
      let convId = conversationId;
      if (!convId && destinataireId) {
        const resConv = await api.post('/conversations', {
          destinataireId,
          titre: trajetTitre,
        });
        convId = resConv.data?._id;
        setConversationId(convId);
      }

      if (!convId) {
        Alert.alert('Erreur', 'Impossible de démarrer la conversation');
        return;
      }

      const res = await api.post(`/conversations/${convId}/messages`, { texte: contenu });
      setMessages((prev) => [...prev, res.data]);
      setTexte('');
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible d’envoyer le message.');
    } finally {
      setEnvoiEnCours(false);
    }
  }, [conversationId, destinataireId, trajetTitre, texte]);

  const formaterHeure = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = useCallback(({ item }) => {
    const estMoi =
      monId &&
      (item.expediteur?._id?.toString() === monId.toString() ||
        item.expediteur?.toString() === monId.toString());

    return (
      <View style={[s.messageWrapper, estMoi ? s.messageWrapperRight : s.messageWrapperLeft]}>
        <View style={[s.bubble, estMoi ? s.bubbleMe : s.bubbleOther]}>
          <Text style={[s.bubbleText, estMoi ? s.bubbleTextMe : s.bubbleTextOther]}>
            {item.texte}
          </Text>
          <View style={s.bubbleMetaRow}>
            <Text style={[s.bubbleTime, estMoi ? s.bubbleTimeMe : s.bubbleTimeOther]}>
              {formaterHeure(item.date)}
            </Text>
            {estMoi && <Text style={s.checkMark}>✓✓</Text>}
          </View>
        </View>
      </View>
    );
  }, [monId]);

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* ─── Header Bleu Royal UniRide (Page 11 PDF) ─── */}
      <View style={s.header}>
        <View style={s.headerContent}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={s.backArrow}>‹</Text>
          </TouchableOpacity>

          <View style={s.headerAvatarContainer}>
            {contactPhoto ? (
              <Image source={{ uri: contactPhoto }} style={s.headerAvatar} />
            ) : (
              <View style={s.headerAvatarPlaceholder}>
                <Text style={s.headerAvatarText}>
                  {contactNom ? contactNom[0].toUpperCase() : 'U'}
                </Text>
              </View>
            )}
            <View style={s.onlineBadge} />
          </View>

          <View style={s.headerTextContainer}>
            <Text style={s.headerName} numberOfLines={1}>
              {contactNom}
            </Text>
            <Text style={s.headerStatus} numberOfLines={1}>
              🟢 En ligne • {contactFiliere}
            </Text>
          </View>
        </View>

        {/* ─── Trajet Context Banner (Page 11 PDF) ─── */}
        {trajetTitre ? (
          <View style={s.tripBanner}>
            <Text style={s.tripBannerText} numberOfLines={1}>
              🚗 {trajetTitre}
            </Text>
            <View style={s.confirmedBadge}>
              <Text style={s.confirmedBadgeText}>Confirmé</Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* ─── Liste des Messages ─── */}
      {chargement ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item._id || String(index)}
          renderItem={renderMessage}
          contentContainerStyle={s.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={s.emptyChat}>
              <Text style={s.emptyChatIcon}>👋</Text>
              <Text style={s.emptyChatTitle}>Démarrez la conversation</Text>
              <Text style={s.emptyChatSub}>
                Organisez votre point de rendez-vous et vos horaires de trajet en toute simplicité.
              </Text>
            </View>
          }
        />
      )}

      {/* ─── Suggestions Rapides ─── */}
      <View style={s.quickRepliesRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={suggestionsRapides}
          keyExtractor={(item) => item}
          contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.quickReplyChip}
              onPress={() => envoyerMessage(item)}
              activeOpacity={0.8}
            >
              <Text style={s.quickReplyText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* ─── Barre de Saisie ─── */}
      <View style={s.inputBar}>
        <TextInput
          style={s.textInput}
          placeholder="Écrivez un message..."
          placeholderTextColor="#94A3B8"
          value={texte}
          onChangeText={setTexte}
          multiline
        />

        <TouchableOpacity
          style={[s.sendBtn, (!texte.trim() || envoiEnCours) && s.sendBtnDisabled]}
          onPress={() => envoyerMessage()}
          disabled={!texte.trim() || envoiEnCours}
          activeOpacity={0.85}
        >
          {envoiEnCours ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={s.sendArrow}>➤</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...shadows.card,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  backArrow: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 28,
  },
  headerAvatarContainer: {
    position: 'relative',
    marginRight: 10,
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  headerAvatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  headerStatus: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
  },
  tripBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 12,
  },
  tripBannerText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  confirmedBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  confirmedBadgeText: {
    color: colors.navy,
    fontSize: 10,
    fontWeight: '800',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 10,
  },
  messageWrapper: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  messageWrapperRight: {
    alignSelf: 'flex-end',
  },
  messageWrapperLeft: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...shadows.card,
  },
  bubbleMe: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextMe: {
    color: '#FFFFFF',
  },
  bubbleTextOther: {
    color: '#0F172A',
  },
  bubbleMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  bubbleTime: {
    fontSize: 10,
  },
  bubbleTimeMe: {
    color: 'rgba(255,255,255,0.7)',
  },
  bubbleTimeOther: {
    color: '#94A3B8',
  },
  checkMark: {
    color: colors.accent,
    fontSize: 10,
    marginLeft: 4,
    fontWeight: '700',
  },
  emptyChat: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 30,
  },
  emptyChatIcon: {
    fontSize: 44,
    marginBottom: 10,
  },
  emptyChatTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptyChatSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  quickRepliesRow: {
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
  },
  quickReplyChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickReplyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    ...shadows.card,
  },
  sendBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  sendArrow: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 2,
  },
});
