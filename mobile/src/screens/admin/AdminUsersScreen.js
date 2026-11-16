import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import api from '../../api';
import { Avatar, Badge, Chip, EmptyState, ErrorState, Header, Input, Ionicons, Loader, Row, Stars } from '../../components/ui';
import { useDonnees } from '../../hooks';
import { colors, font, spacing } from '../../theme';
import { tempsRelatif } from '../../utils';

const FILTRES = [
  { valeur: '', label: 'Tous' },
  { valeur: 'conducteurs', label: 'Conducteurs' },
  { valeur: 'bloques', label: 'Bloqués' },
  { valeur: 'admins', label: 'Admins' },
];

/** Gestion des utilisateurs (US18). */
export default function AdminUsersScreen({ navigation }) {
  const [q, setQ] = useState('');
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setRecherche(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  const { data, chargement, erreur, rafraichir, rafraichissement, reessayer } = useDonnees(
    () => api.get('/admin/users', { params: { q: recherche || undefined, filtre: filtre || undefined } }).then((r) => r.data),
    [recherche, filtre]
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Utilisateurs" subtitle={data ? `${data.length} compte(s)` : ' '}>
        <Input icon="search" placeholder="Nom, e-mail ou filière" value={q} onChangeText={setQ} autoCapitalize="none" style={{ marginTop: spacing.sm, marginBottom: spacing.sm }} />
        <Row gap={8}>
          {FILTRES.map((f) => (
            <Chip key={f.valeur} label={f.label} selected={filtre === f.valeur} onPress={() => setFiltre(f.valeur)} style={{ paddingVertical: 6 }} />
          ))}
        </Row>
      </Header>
      {chargement ? (
        <Loader />
      ) : erreur ? (
        <ErrorState text={erreur} onRetry={reessayer} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(u) => u._id}
          refreshControl={<RefreshControl refreshing={rafraichissement} onRefresh={rafraichir} colors={[colors.primary]} />}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={data.length ? { paddingVertical: spacing.sm } : { flexGrow: 1, justifyContent: 'center' }}
          ListEmptyComponent={<EmptyState icon="people-outline" title="Aucun utilisateur" text="Modifiez la recherche ou le filtre." />}
          renderItem={({ item: u }) => (
            <Pressable onPress={() => navigation.navigate('AdminUserDetail', { id: u._id })} style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.input }]}>
              <View>
                <Avatar uri={u.photo} nom={u.nom} size={46} style={u.bloque && { opacity: 0.4 }} />
                {u.bloque ? (
                  <View style={styles.cadenas}>
                    <Ionicons name="lock-closed" size={11} color={colors.white} />
                  </View>
                ) : null}
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Row gap={6}>
                  <Text style={[font.label, { fontSize: 15, flexShrink: 1 }]} numberOfLines={1}>
                    {u.nom}
                  </Text>
                  {u.role === 'admin' ? <Badge label="Admin" tone="primary" /> : null}
                  {u.vehicule ? <Ionicons name="car" size={14} color={colors.primary} /> : null}
                </Row>
                <Text style={font.caption} numberOfLines={1}>
                  {u.email}
                </Text>
                <Row gap={8} style={{ marginTop: 3 }}>
                  <Stars value={u.noteMoyenne} count={u.nombreAvis} size={11} />
                  {u.nbSignalements ? <Badge label={`${u.nbSignalements} signalement(s)`} tone="danger" icon="flag" /> : null}
                </Row>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                {u.bloque ? <Badge label="Bloqué" tone="danger" /> : <Text style={[font.caption, { fontSize: 11 }]}>{tempsRelatif(u.derniereActivite)}</Text>}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  sep: { height: 1, backgroundColor: colors.borderSoft, marginLeft: spacing.xl + 46 + spacing.md },
  cadenas: { position: 'absolute', right: -2, bottom: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
});
