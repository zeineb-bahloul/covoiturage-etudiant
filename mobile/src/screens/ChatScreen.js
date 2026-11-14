import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../api';
import { Avatar, ErrorState, Header, IconButton, Ionicons, Loader, Row } from '../components/ui';
import { useRealtime } from '../context/AuthContext';
import { getSocket } from '../socket';
import { colors, font, radius, spacing } from '../theme';
import { court, erreurApi, heureMessage, quand } from '../utils';

const RAPIDES = ['Je suis au point de rendez-vous', "J'arrive dans 5 minutes", 'On se retrouve où ?', 'Merci beaucoup !'];

function jourSeparateur(date) {
  const d = new Date(date);
  const auj = new Date();
  const hier = new Date();
  hier.setDate(auj.getDate() - 1);
  if (d.toDateString() === auj.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === hier.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Chat en temps réel conducteur ↔ passager (US12, Socket.io). */
export default function ChatScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { conversationId: convInitiale, destinataireId, trajetId } = route.params || {};
  const { rafraichirCompteurs } = useRealtime();

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [monId, setMonId] = useState(null);
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [ecrit, setEcrit] = useState(false);
  const liste = useRef(null);
  const minuteurEcrit = useRef(null);
  const dernierTyping = useRef(0);

  const charger = useCallback(async () => {
    try {
      const me = await api.get('/auth/me');
      setMonId(me.data._id);
      let conv;
      if (convInitiale) {
        conv = (await api.get(`/conversations/${convInitiale}`)).data;
      } else {
        conv = (await api.post('/conversations', { destinataireId, trajetId })).data;
      }
      setConversation(conv);
      const msgs = await api.get(`/conversations/${conv._id}/messages`);
      setMessages(msgs.data);
      rafraichirCompteurs();
    } catch (err) {
      setErreur(erreurApi(err, 'Impossible d’ouvrir la discussion'));
    } finally {
      setChargement(false);
    }
  }, [convInitiale, destinataireId, trajetId, rafraichirCompteurs]);

  useEffect(() => {
    charger();
  }, [charger]);

  // Temps réel : rejoindre la salle de la conversation
  useEffect(() => {
    const socket = getSocket();
    const id = conversation?._id;
    if (!socket || !id) return undefined;

    const rejoindre = () => socket.emit('conversation:join', id);
    const surMessage = (m) => {
      if (m.conversationId !== id) return;
      setMessages((avant) => (avant.some((x) => x._id === m._id) ? avant : [...avant, m]));
      setEcrit(false);
    };
    const surTyping = ({ conversationId }) => {
      if (conversationId !== id) return;
      setEcrit(true);
      clearTimeout(minuteurEcrit.current);
      minuteurEcrit.current = setTimeout(() => setEcrit(false), 3000);
    };
    const surLu = ({ conversationId, userId }) => {
      if (conversationId !== id) return;
      setMessages((avant) => avant.map((m) => (m.luPar?.includes(userId) ? m : { ...m, luPar: [...(m.luPar || []), userId] })));
    };

    rejoindre();
    socket.on('connect', rejoindre);
    socket.on('message:new', surMessage);
    socket.on('conversation:typing', surTyping);
    socket.on('conversation:read', surLu);
    return () => {
      socket.emit('conversation:leave', id);
      socket.off('connect', rejoindre);
      socket.off('message:new', surMessage);
      socket.off('conversation:typing', surTyping);
      socket.off('conversation:read', surLu);
      clearTimeout(minuteurEcrit.current);
    };
  }, [conversation?._id]);

  const envoyer = async (contenu = texte) => {
    const t = contenu.trim();
    if (!t || !conversation || envoi) return;
    setEnvoi(true);
    try {
      const { data } = await api.post(`/conversations/${conversation._id}/messages`, { texte: t });
      setMessages((avant) => (avant.some((x) => x._id === data._id) ? avant : [...avant, data]));
      setTexte('');
    } catch (err) {
      setErreur(erreurApi(err, 'Message non envoyé'));
      setTimeout(() => setErreur(''), 3000);
    } finally {
      setEnvoi(false);
    }
  };

  const surSaisie = (v) => {
    setTexte(v);
    const now = Date.now();
    if (conversation && now - dernierTyping.current > 2000) {
      dernierTyping.current = now;
      getSocket()?.emit('conversation:typing', conversation._id);
    }
  };

  if (chargement) return <Loader />;
  if (!conversation) return <ErrorState text={erreur} onRetry={() => navigation.goBack()} />;

  const autre = conversation.autreParticipant || {};
  const trajet = conversation.trajet;
  const autreId = autre._id;

  // Séparateurs de date
  const lignes = [];
  let jourPrec = '';
  for (const m of messages) {
    const j = jourSeparateur(m.createdAt);
    if (j !== jourPrec) {
      lignes.push({ type: 'jour', id: `j-${m._id}`, label: j });
      jourPrec = j;
    }
    lignes.push({ type: 'msg', id: m._id, m });
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Header
        title={autre.nom || 'Discussion'}
        subtitle={ecrit ? 'est en train d’écrire…' : autre.filiere || 'Étudiant ISET Nabeul'}
        onBack={() => navigation.goBack()}
        right={
          autreId ? (
            <IconButton
              icon="flag-outline"
              label="Signaler"
              onPress={() => navigation.navigate('Report', { utilisateurSignaleId: autreId, utilisateurNom: autre.nom, trajetId: trajet?._id })}
            />
          ) : null
        }
      >
        {trajet ? (
          <Pressable onPress={() => navigation.navigate('RideDetail', { id: trajet._id })} style={styles.trajet}>
            <Ionicons name="car-outline" size={16} color={colors.primary} />
            <Text style={styles.trajetTexte} numberOfLines={1}>
              {court(trajet.depart?.label)} → {court(trajet.destination?.label)} · {trajet.heureDepart} · {quand(trajet)}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </Pressable>
        ) : null}
      </Header>

      <FlatList
        ref={liste}
        data={lignes}
        keyExtractor={(l) => l.id}
        contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
        onContentSizeChange={() => liste.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.vide}>
            <Avatar uri={autre.photo} nom={autre.nom} size={64} />
            <Text style={[font.h3, { marginTop: spacing.md }]}>{autre.nom}</Text>
            <Text style={[font.small, { textAlign: 'center', marginTop: 4 }]}>Fixez ensemble le point et l'heure de rendez-vous.</Text>
          </View>
        }
        renderItem={({ item }) => {
          if (item.type === 'jour') {
            return <Text style={styles.jour}>{item.label}</Text>;
          }
          const m = item.m;
          const estMoi = (m.expediteur?._id || m.expediteur) === monId;
          const lu = estMoi && autreId && (m.luPar || []).includes(autreId);
          return (
            <View style={[styles.bulleLigne, estMoi ? { justifyContent: 'flex-end' } : null]}>
              <View style={[styles.bulle, estMoi ? styles.bulleMoi : styles.bulleAutre]}>
                <Text style={{ color: estMoi ? colors.white : colors.ink, fontSize: 15, lineHeight: 20 }}>{m.texte}</Text>
                <Row gap={4} style={{ alignSelf: 'flex-end', marginTop: 3 }}>
                  <Text style={{ fontSize: 11, color: estMoi ? 'rgba(255,255,255,0.75)' : colors.faint }}>{heureMessage(m.createdAt)}</Text>
                  {estMoi ? <Ionicons name={lu ? 'checkmark-done' : 'checkmark'} size={14} color={lu ? colors.accent : 'rgba(255,255,255,0.75)'} /> : null}
                </Row>
              </View>
            </View>
          );
        }}
      />

      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}

      {messages.length < 4 ? (
        <FlatList
          horizontal
          data={RAPIDES}
          keyExtractor={(r) => r}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 8, paddingBottom: 8 }}
          style={{ flexGrow: 0 }}
          renderItem={({ item }) => (
            <Pressable style={styles.rapide} onPress={() => envoyer(item)}>
              <Text style={styles.rapideTexte}>{item}</Text>
            </Pressable>
          )}
        />
      ) : null}

      <View style={[styles.saisie, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <TextInput
          style={styles.input}
          value={texte}
          onChangeText={surSaisie}
          placeholder="Votre message…"
          placeholderTextColor={colors.faint}
          multiline
          maxLength={1000}
        />
        <Pressable onPress={() => envoyer()} disabled={!texte.trim() || envoi} style={[styles.envoyer, (!texte.trim() || envoi) && { opacity: 0.4 }]}>
          {envoi ? <ActivityIndicator color={colors.white} size="small" /> : <Ionicons name="send" size={18} color={colors.white} />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  trajet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.sm,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  trajetTexte: { flex: 1, color: colors.primary, fontWeight: '600', fontSize: 13 },
  vide: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  jour: { alignSelf: 'center', fontSize: 12, color: colors.muted, backgroundColor: colors.input, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, marginVertical: spacing.md, overflow: 'hidden' },
  bulleLigne: { flexDirection: 'row', marginBottom: 6 },
  bulle: { maxWidth: '80%', paddingHorizontal: 13, paddingVertical: 8, borderRadius: 18 },
  bulleMoi: { backgroundColor: colors.primary, borderBottomRightRadius: 5 },
  bulleAutre: { backgroundColor: colors.card, borderBottomLeftRadius: 5, borderWidth: 1, borderColor: colors.borderSoft },
  erreur: { color: colors.danger, textAlign: 'center', fontSize: 13, paddingBottom: 6 },
  rapide: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 7 },
  rapideTexte: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  saisie: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  input: { flex: 1, backgroundColor: colors.input, borderRadius: 22, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, fontSize: 15, maxHeight: 110, color: colors.ink },
  envoyer: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
