import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import api from '../api';
import { Avatar, EmptyState, ErrorState, Header, Input, Ionicons, Loader, Row } from '../components/ui';
import { useRealtime } from '../context/AuthContext';
import { useDonnees } from '../hooks';
import { getSocket } from '../socket';
import { colors, font, spacing } from '../theme';
import { tempsRelatif } from '../utils';

/** Liste des conversations (onglet Messages). */
export default function DiscussionsScreen({ navigation }) {
  const [recherche, setRecherche] = useState('');
  const { rafraichirCompteurs } = useRealtime();
  const { data, chargement, erreur, rafraichir, rafraichissement, recharger, reessayer } = useDonnees(() =>
    api.get('/conversations').then((r) => r.data)
  );

  // Mise à jour en direct quand un message arrive
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    socket.on('conversation:update', recharger);
    return () => socket.off('conversation:update', recharger);
  }, [recharger]);

  useEffect(() => {
    rafraichirCompteurs();
  }, [data, rafraichirCompteurs]);

  if (chargement) return <Loader />;
  if (erreur) return <ErrorState text={erreur} onRetry={reessayer} />;

  const q = recherche.trim().toLowerCase();
  const liste = data.filter(
    (c) =>
      !q ||
      c.autreParticipant?.nom?.toLowerCase().includes(q) ||
      c.titre?.toLowerCase().includes(q) ||
      c.dernierMessage?.texte?.toLowerCase().includes(q)
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Messages" subtitle="Organisez vos rendez-vous">
        {data.length > 3 ? (
          <Input icon="search" placeholder="Rechercher une discussion" value={recherche} onChangeText={setRecherche} style={{ marginTop: spacing.sm, marginBottom: 0 }} />
        ) : null}
      </Header>
      <FlatList
        data={liste}
        keyExtractor={(c) => c._id}
        refreshControl={<RefreshControl refreshing={rafraichissement} onRefresh={rafraichir} colors={[colors.primary]} />}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        contentContainerStyle={liste.length ? { paddingVertical: spacing.sm } : { flexGrow: 1, justifyContent: 'center' }}
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            title={q ? 'Aucun résultat' : 'Aucune discussion'}
            text={q ? 'Essayez un autre nom.' : 'Une discussion s’ouvre automatiquement quand une réservation est acceptée. Vous pouvez aussi écrire à un conducteur depuis un trajet.'}
          />
        }
        renderItem={({ item: c }) => {
          const autre = c.autreParticipant || {};
          const moi = c.dernierMessage?.expediteur && c.dernierMessage.expediteur !== autre._id;
          return (
            <Pressable
              onPress={() => navigation.navigate('Chat', { conversationId: c._id })}
              style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.input }]}
            >
              <Avatar uri={autre.photo} nom={autre.nom} size={50} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={[styles.nom, c.nonLu && { fontWeight: '800' }]} numberOfLines={1}>
                    {autre.nom || 'Utilisateur supprimé'}
                  </Text>
                  <Text style={[font.caption, c.nonLu && { color: colors.primary, fontWeight: '700' }]}>
                    {tempsRelatif(c.dernierMessage?.texte ? c.dernierMessage.date : c.updatedAt)}
                  </Text>
                </Row>
                {c.titre ? (
                  <Row gap={4} style={{ marginTop: 1 }}>
                    <Ionicons name="car-outline" size={12} color={colors.muted} />
                    <Text style={font.caption} numberOfLines={1}>
                      {c.titre}
                    </Text>
                  </Row>
                ) : null}
                <Row style={{ marginTop: 3 }}>
                  <Text style={[styles.apercu, c.nonLu && { color: colors.ink, fontWeight: '600' }]} numberOfLines={1}>
                    {c.dernierMessage?.texte ? `${moi ? 'Vous : ' : ''}${c.dernierMessage.texte}` : 'Nouvelle discussion — dites bonjour 👋'}
                  </Text>
                  {c.nonLu ? <View style={styles.point} /> : null}
                </Row>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  nom: { fontSize: 15, fontWeight: '600', color: colors.ink, flex: 1, marginRight: 8 },
  apercu: { flex: 1, color: colors.muted, fontSize: 14 },
  point: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginLeft: 8 },
  sep: { height: 1, backgroundColor: colors.borderSoft, marginLeft: spacing.xl + 50 + spacing.md },
});
