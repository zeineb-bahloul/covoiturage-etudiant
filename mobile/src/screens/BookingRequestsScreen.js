import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import api from '../api';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Header, Loader, Row, ScoreBadge, Screen, Segmented, Stars } from '../components/ui';
import { useDonnees } from '../hooks';
import { colors, font, radius, spacing } from '../theme';
import { court, erreurApi, quand } from '../utils';

/** Demandes de réservation reçues par le conducteur (US10). */
export default function BookingRequestsScreen({ route, navigation }) {
  const trajetId = route.params?.trajetId;
  const [onglet, setOnglet] = useState('en_attente');
  const [action, setAction] = useState(null);
  const { data, chargement, erreur, rafraichir, rafraichissement, recharger, reessayer } = useDonnees(
    () => api.get('/bookings/requests', { params: trajetId ? { trajetId } : {} }).then((r) => r.data),
    [trajetId]
  );

  const accepter = async (b) => {
    setAction(b._id);
    try {
      await api.patch(`/bookings/${b._id}/accept`);
      await recharger();
    } catch (err) {
      Alert.alert('Impossible d’accepter', erreurApi(err));
    } finally {
      setAction(null);
    }
  };

  const refuser = (b) =>
    Alert.alert(b.statut === 'acceptee' ? 'Retirer ce passager ?' : 'Refuser la demande ?', `${b.passager?.nom} sera prévenu(e).`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: b.statut === 'acceptee' ? 'Retirer' : 'Refuser',
        style: 'destructive',
        onPress: async () => {
          setAction(b._id);
          try {
            await api.patch(`/bookings/${b._id}/refuse`);
            await recharger();
          } catch (err) {
            Alert.alert('Action impossible', erreurApi(err));
          } finally {
            setAction(null);
          }
        },
      },
    ]);

  if (chargement) return <Loader />;
  if (erreur) return <ErrorState text={erreur} onRetry={reessayer} />;

  const compte = (s) => data.filter((d) => d.statut === s).length;
  const liste = data.filter((d) => (onglet === 'autres' ? ['refusee', 'annulee'].includes(d.statut) : d.statut === onglet));

  return (
    <Screen
      header={
        <Header title="Demandes de réservation" subtitle={trajetId ? 'Pour ce trajet' : 'Tous mes trajets'} onBack={() => navigation.goBack()}>
          <Segmented
            style={{ marginTop: spacing.sm }}
            value={onglet}
            onChange={setOnglet}
            options={[
              { value: 'en_attente', label: 'En attente', count: compte('en_attente') },
              { value: 'acceptee', label: 'Acceptées', count: compte('acceptee') },
              { value: 'autres', label: 'Autres' },
            ]}
          />
        </Header>
      }
      onRefresh={rafraichir}
      refreshing={rafraichissement}
    >
      {liste.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title={onglet === 'en_attente' ? 'Aucune demande en attente' : 'Rien ici'}
          text={onglet === 'en_attente' ? 'Vous serez notifié dès qu’un étudiant demande une place.' : null}
        />
      ) : (
        liste.map((b) => {
          const p = b.passager || {};
          const t = b.trajet;
          const enCours = action === b._id;
          return (
            <Card key={b._id}>
              {t && !trajetId ? (
                <Text style={[font.caption, { marginBottom: spacing.md }]}>
                  {court(t.depart?.label)} → {court(t.destination?.label)} · {t.heureDepart} · {quand(t)}
                </Text>
              ) : null}
              <Row>
                <Avatar uri={p.photo} nom={p.nom} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={font.h3}>{p.nom || 'Étudiant'}</Text>
                  <Text style={font.caption}>{p.filiere || 'ISET Nabeul'}</Text>
                  <Stars value={p.noteMoyenne} count={p.nombreAvis} size={12} />
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <ScoreBadge score={b.scoreMatch} />
                  <Badge label={`${b.places} place${b.places > 1 ? 's' : ''}`} tone="primary" />
                </View>
              </Row>
              {b.message ? (
                <View style={{ backgroundColor: colors.input, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md }}>
                  <Text style={[font.small, { color: colors.text, fontStyle: 'italic' }]}>« {b.message} »</Text>
                </View>
              ) : null}
              {b.statut === 'en_attente' ? (
                <Row style={{ marginTop: spacing.md }}>
                  <Button title="Refuser" variant="danger" size="sm" style={{ flex: 1 }} onPress={() => refuser(b)} disabled={enCours} />
                  <Button title="Accepter" variant="success" icon="checkmark" size="sm" style={{ flex: 1.4 }} onPress={() => accepter(b)} loading={enCours} />
                </Row>
              ) : b.statut === 'acceptee' ? (
                <Row style={{ marginTop: spacing.md }}>
                  <Button
                    title="Écrire"
                    icon="chatbubble-outline"
                    variant="secondary"
                    size="sm"
                    style={{ flex: 1 }}
                    onPress={() => navigation.navigate('Chat', { destinataireId: p._id, trajetId: t?._id })}
                  />
                  {t?.statut === 'actif' ? <Button title="Retirer" variant="danger" size="sm" style={{ flex: 1 }} onPress={() => refuser(b)} loading={enCours} /> : null}
                </Row>
              ) : (
                <Badge style={{ marginTop: spacing.md }} label={b.statut === 'refusee' ? 'Refusée' : 'Annulée par le passager'} tone={b.statut === 'refusee' ? 'danger' : 'neutral'} />
              )}
            </Card>
          );
        })
      )}
    </Screen>
  );
}
