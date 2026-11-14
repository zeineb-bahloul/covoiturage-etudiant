import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import api from '../api';
import RideCard from '../components/RideCard';
import { Chip, EmptyState, ErrorState, Header, Loader, Row } from '../components/ui';
import { colors, font, spacing } from '../theme';
import { court, dateLisible, erreurApi } from '../utils';

const TRIS = [
  { valeur: 'score', label: 'Compatibilité' },
  { valeur: 'heure', label: 'Heure' },
  { valeur: 'prix', label: 'Prix' },
];

/** Résultats de recherche classés par score de compatibilité (US7, US11). */
export default function RideResultsScreen({ route, navigation }) {
  const p = route.params;
  const [tri, setTri] = useState('score');
  const [trajets, setTrajets] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [erreur, setErreur] = useState('');

  const charger = useCallback(async () => {
    try {
      const { data } = await api.get('/rides/search', {
        params: {
          lat: p.lat,
          lng: p.lng,
          date: p.date,
          heure: p.heure,
          prixMax: p.prixMax,
          noteMin: p.noteMin,
          nonFumeur: p.nonFumeur ? 'true' : undefined,
          mixte: p.mixte ? 'true' : undefined,
          tri,
        },
      });
      setTrajets(data);
      setErreur('');
    } catch (err) {
      setErreur(erreurApi(err, 'Recherche impossible'));
    } finally {
      setChargement(false);
      setRafraichissement(false);
    }
  }, [p, tri]);

  useEffect(() => {
    charger();
  }, [charger]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header
        title={`Depuis ${court(p.label)}`}
        subtitle={`${dateLisible(p.date)}${p.heure ? ` · vers ${p.heure}` : ''}`}
        onBack={() => navigation.goBack()}
      >
        <Row gap={8} style={{ marginTop: spacing.sm }}>
          <Text style={font.caption}>Trier par</Text>
          {TRIS.map((t) => (
            <Chip key={t.valeur} label={t.label} selected={tri === t.valeur} onPress={() => setTri(t.valeur)} style={{ paddingVertical: 6 }} />
          ))}
        </Row>
      </Header>
      {chargement ? (
        <Loader text="Calcul des compatibilités…" />
      ) : erreur ? (
        <ErrorState text={erreur} onRetry={charger} />
      ) : (
        <FlatList
          data={trajets}
          keyExtractor={(t) => t._id}
          contentContainerStyle={{ padding: spacing.xl, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={rafraichissement}
              onRefresh={() => {
                setRafraichissement(true);
                charger();
              }}
              colors={[colors.primary]}
            />
          }
          ListHeaderComponent={
            trajets.length ? (
              <Text style={[font.small, { marginBottom: spacing.md }]}>
                {trajets.length} trajet{trajets.length > 1 ? 's' : ''} trouvé{trajets.length > 1 ? 's' : ''}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="car-outline"
              title="Aucun trajet trouvé"
              text="Essayez un autre jour, « Toute la journée », ou retirez des filtres. Les trajets partant à moins de 15 km sont affichés."
              action="Modifier la recherche"
              onAction={() => navigation.goBack()}
            />
          }
          renderItem={({ item }) => <RideCard ride={item} showWhen={false} onPress={() => navigation.navigate('RideDetail', { id: item._id })} />}
        />
      )}
    </View>
  );
}
