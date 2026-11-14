import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font, spacing } from '../theme';
import { Avatar, Badge, Card, Ionicons, RouteLine, Row, ScoreBadge, Stars } from './ui';
import { court, nombre, prix, quand } from '../utils';

/** Carte d'un trajet proposé (accueil, résultats de recherche). */
function RideCard({ ride, onPress, showWhen = true }) {
  const c = ride.conducteur || {};
  const pref = c.preferences || {};
  const km = ride.matchDetails?.proximite?.km ?? ride.distanceDepartKm;
  return (
    <Card onPress={onPress}>
      <Row style={{ justifyContent: 'space-between', marginBottom: spacing.md }}>
        <Row style={{ flex: 1 }}>
          <Avatar uri={c.photo} nom={c.nom} size={42} />
          <View style={{ flex: 1 }}>
            <Text style={styles.nom} numberOfLines={1}>
              {c.nom}
            </Text>
            <Stars value={c.noteMoyenne} count={c.nombreAvis} size={13} />
          </View>
        </Row>
        <ScoreBadge score={ride.scoreMatch} />
      </Row>

      <RouteLine
        compact
        depart={court(ride.depart?.label)}
        arrivee={court(ride.destination?.label)}
        heureDepart={ride.heureDepart}
        heureArrivee={ride.heureArrivee}
      />

      <View style={styles.footer}>
        <Row gap={6} style={{ flex: 1, flexWrap: 'wrap' }}>
          {showWhen ? <Badge label={quand(ride)} icon="calendar-outline" /> : null}
          {typeof km === 'number' ? <Badge label={`${nombre(km)} km de vous`} icon="walk-outline" tone="info" /> : null}
          {pref.nonFumeur ? <Badge label="Non-fumeur" icon="ban-outline" /> : null}
        </Row>
        <View style={{ alignItems: 'flex-end', marginLeft: spacing.sm }}>
          <Text style={styles.prix}>{prix(ride.prix)}</Text>
          <Row gap={3}>
            <Ionicons name="person-outline" size={12} color={colors.muted} />
            <Text style={font.caption}>
              {ride.places} place{ride.places > 1 ? 's' : ''}
            </Text>
          </Row>
        </View>
      </View>
    </Card>
  );
}

export default memo(RideCard);

const styles = StyleSheet.create({
  nom: { fontSize: 15, fontWeight: '700', color: colors.ink },
  prix: { fontSize: 17, fontWeight: '800', color: colors.primary },
  footer: { flexDirection: 'row', alignItems: 'flex-end', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderSoft },
});
