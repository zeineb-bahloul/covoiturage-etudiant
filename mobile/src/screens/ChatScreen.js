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
import { colors, shadows } from '../theme';

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

  // Suggestions rapides pour fixer le rendez-vous
  const suggestionsRapides = [
    'Je suis au point de rendez-vous 📍',
    'J’arrive dans 5 minutes 🚗',
    'Tout est bon pour l’horaire ?',
    'Merci beaucoup ! 👍',
  ];

  // 1. Initialiser : obtenir monId et la conversation
  useEffect(() => {
    let intervalId;

    const initialiser = async () => {
      try {
        const resMe = await api.get('/auth/me');
        setMonId(resMe.data?._id);

        let convId = initialConvId;
        if (!convId && destinataireId) {
          // Créer ou récupérer la conversation
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

  // 2. Polling automatique des nouveaux messages toutes les 3.5s
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

  // Envoyer un message
  const envoyerMessage = async (texteAEnvoyer = null) => {
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
      console.log('Erreur envoi message :', err);
      Alert.alert('Erreur', 'Impossible d’envoyer le message.');
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const formaterHeure = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }) => {
    const estMoi =
      monId && (item.expediteur?._id?.toString() === monId.toString() || item.expediteur?.toString() === monId.toString());

    return (
      <View
        style={[
          styles.messageLigne,
          estMoi ? styles.messageLigneDroite : styles.messageLigneGauche,
        ]}
      >
        <View
          style={[
            styles.bulle,
            estMoi ? styles.bulleMoi : styles.bulleAutre,
          ]}
        >
          <Text style={[styles.messageTexte, estMoi ? styles.messageTexteMoi : styles.messageTexteAutre]}>
            {item.texte}
          </Text>
          <Text style={[styles.messageHeure, estMoi ? styles.messageHeureMoi : styles.messageHeureAutre]}>
            {formaterHeure(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header personnalisé UniRide */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.headerBackIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerAvatarWrapper}>
          {contactPhoto ? (
            <Image source={{ uri: contactPhoto }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Text style={styles.headerAvatarInitial}>
                {contactNom ? contactNom[0].toUpperCase() : 'U'}
              </Text>
            </View>
          )}
          <View style={styles.pastilleVerte} />
        </View>

        <View style={styles.headerInfos}>
          <Text style={styles.headerNom} numberOfLines={1}>
            {contactNom}
          </Text>
          <Text style={styles.headerFiliere} numberOfLines={1}>
            {contactFiliere}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={() =>
            Alert.alert(
              'Appel d’urgence / Contact',
              `Souhaitez-vous joindre ${contactNom} ?`,
              [{ text: 'Annuler' }, { text: 'Appeler', onPress: () => {} }]
            )
          }
        >
          <Text style={styles.headerActionIcon}>📞</Text>
        </TouchableOpacity>
      </View>

      {/* Trajet Banner si lié à un trajet */}
      {trajetTitre ? (
        <View style={styles.trajetBandeau}>
          <Text style={styles.trajetBandeauTexte} numberOfLines={1}>
            🚗 {trajetTitre}
          </Text>
        </View>
      ) : null}

      {/* Messages */}
      {chargement ? (
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item._id || index.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesConteneur}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.videConteneur}>
              <Text style={styles.videIcone}>👋</Text>
              <Text style={styles.videTitre}>Démarrez la conversation</Text>
              <Text style={styles.videSousTitre}>
                Convenez précisément du point de départ ou de rendez-vous avec {contactNom}.
              </Text>
            </View>
          }
        />
      )}

      {/* Suggestions rapides */}
      <View style={styles.suggestionsConteneur}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={suggestionsRapides}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.suggestionPill}
              onPress={() => envoyerMessage(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.suggestionPillTexte}>{item}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.suggestionsList}
        />
      </View>

      {/* Barre de saisie */}
      <View style={styles.inputBarre}>
        <TextInput
          style={styles.inputText}
          placeholder="Écrivez un message..."
          placeholderTextColor={colors.textLight}
          value={texte}
          onChangeText={setTexte}
          multiline
        />
        <TouchableOpacity
          style={[styles.envoyerBouton, !texte.trim() && styles.envoyerBoutonDesactive]}
          onPress={() => envoyerMessage()}
          disabled={envoiEnCours || !texte.trim()}
          activeOpacity={0.8}
        >
          {envoiEnCours ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.envoyerIcone}>➤</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centre: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingTop: Platform.OS === 'ios' ? 48 : 36,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    ...shadows.card,
  },
  headerBackBtn: {
    padding: 6,
    marginRight: 6,
  },
  headerBackIcon: {
    fontSize: 22,
    color: colors.text,
    fontWeight: 'bold',
  },
  headerAvatarWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  headerAvatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarInitial: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.primary,
  },
  pastilleVerte: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: colors.card,
  },
  headerInfos: {
    flex: 1,
  },
  headerNom: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  headerFiliere: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActionIcon: {
    fontSize: 18,
  },
  trajetBandeau: {
    backgroundColor: '#ECFDF5',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#D1FAE5',
  },
  trajetBandeauTexte: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  messagesConteneur: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  messageLigne: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  messageLigneDroite: {
    justifyContent: 'flex-end',
  },
  messageLigneGauche: {
    justifyContent: 'flex-start',
  },
  bulle: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bulleMoi: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bulleAutre: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  messageTexte: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTexteMoi: {
    color: colors.white,
  },
  messageTexteAutre: {
    color: colors.text,
  },
  messageHeure: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageHeureMoi: {
    color: 'rgba(255,255,255,0.7)',
  },
  messageHeureAutre: {
    color: colors.textLight,
  },
  videConteneur: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 30,
  },
  videIcone: {
    fontSize: 44,
    marginBottom: 10,
  },
  videTitre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  videSousTitre: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  suggestionsConteneur: {
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
  },
  suggestionsList: {
    paddingHorizontal: 14,
    gap: 8,
  },
  suggestionPill: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  suggestionPillTexte: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  inputBarre: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  inputText: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    maxHeight: 100,
  },
  envoyerBouton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    ...shadows.card,
  },
  envoyerBoutonDesactive: {
    backgroundColor: '#CBD5E1',
  },
  envoyerIcone: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

