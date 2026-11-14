import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import api from '../api';
import { EmptyState, ErrorState, Header, Ionicons, Loader, Segmented } from '../components/ui';
import { useRealtime } from '../context/AuthContext';
import { useDonnees } from '../hooks';
import { iconeNotification, ouvrirNotification } from '../notifications';
import { getSocket } from '../socket';
import { colors, font, spacing } from '../theme';
import { tempsRelatif } from '../utils';

/** Centre de notifications (US13). */
export default function NotificationsScreen({ navigation }) {
  const [filtre, setFiltre] = useState('toutes');
  const { rafraichirCompteurs } = useRealtime();
  const { data, setData, chargement, erreur, rafraichir, rafraichissement, recharger, reessayer } = useDonnees(() =>
    api.get('/notifications').then((r) => r.data.notifications)
  );

  useEffect(() => {
    const socket = getSocket();
    socket?.on('notification:new', recharger);
    return () => socket?.off('notification:new', recharger);
  }, [recharger]);

  const toutLire = async () => {
    await api.patch('/notifications/read-all').catch(() => {});
    setData((l) => l.map((n) => ({ ...n, lu: true })));
    rafraichirCompteurs();
  };

  const ouvrir = (n) => {
    if (!n.lu) {
      api
        .patch(`/notifications/${n._id}/read`)
        .then(rafraichirCompteurs)
        .catch(() => {});
      setData((l) => l.map((x) => (x._id === n._id ? { ...x, lu: true } : x)));
    }
    ouvrirNotification(navigation, n);
  };

  if (chargement) return <Loader />;
  if (erreur) return <ErrorState text={erreur} onRetry={reessayer} />;

  const nonLues = data.filter((n) => !n.lu).length;
  const liste = filtre === 'non_lues' ? data.filter((n) => !n.lu) : data;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header
        title="Notifications"
        subtitle={nonLues ? `${nonLues} non lue(s)` : 'Tout est lu'}
        onBack={() => navigation.goBack()}
        right={
          nonLues ? (
            <Pressable onPress={toutLire} hitSlop={8}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Tout lire</Text>
            </Pressable>
          ) : null
        }
      >
        <Segmented
          style={{ marginTop: spacing.sm }}
          value={filtre}
          onChange={setFiltre}
          options={[
            { value: 'toutes', label: 'Toutes' },
            { value: 'non_lues', label: 'Non lues', count: nonLues },
          ]}
        />
      </Header>
      <FlatList
        data={liste}
        keyExtractor={(n) => n._id}
        refreshControl={<RefreshControl refreshing={rafraichissement} onRefresh={rafraichir} colors={[colors.primary]} />}
        contentContainerStyle={liste.length ? { paddingVertical: spacing.sm } : { flexGrow: 1, justifyContent: 'center' }}
        ListEmptyComponent={<EmptyState icon="notifications-off-outline" title="Aucune notification" text="Réservations, suggestions et messages apparaîtront ici." />}
        renderItem={({ item: n }) => {
          const ic = iconeNotification(n.type);
          return (
            <Pressable onPress={() => ouvrir(n)} style={({ pressed }) => [styles.item, !n.lu && styles.nonLu, pressed && { opacity: 0.7 }]}>
              <View style={[styles.icone, { backgroundColor: ic.bg }]}>
                <Ionicons name={ic.name} size={20} color={ic.fg} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[font.label, !n.lu && { fontWeight: '800' }]}>{n.titre}</Text>
                <Text style={[font.small, { color: colors.text }]}>{n.message}</Text>
                <Text style={[font.caption, { marginTop: 3 }]}>{tempsRelatif(n.createdAt)}</Text>
              </View>
              {!n.lu ? <View style={styles.point} /> : null}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  nonLu: { backgroundColor: colors.primarySoft },
  icone: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  point: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary, marginTop: 6 },
});
