import React, { useEffect } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import api from '../../api';
import { Avatar, Badge, Button, Card, ErrorState, Header, IconButton, Ionicons, Loader, ProgressBar, Row, Screen, SectionTitle, StatTile, Stars } from '../../components/ui';
import { useAuth, useRealtime } from '../../context/AuthContext';
import { useDonnees } from '../../hooks';
import { getSocket } from '../../socket';
import { colors, font, radius, spacing } from '../../theme';
import { court, erreurApi, nombre, tempsRelatif } from '../../utils';

/** Tableau de bord global de l'administration (US20) + alertes SOS (US22). */
export default function AdminDashboardScreen({ navigation, allerOnglet }) {
  const { deconnecter } = useAuth();
  const { nbNotifs } = useRealtime();
  const { data, chargement, erreur, rafraichir, rafraichissement, recharger, reessayer } = useDonnees(async () => {
    const [d, sos] = await Promise.all([api.get('/admin/dashboard'), api.get('/admin/sos', { params: { statut: 'active' } })]);
    return { ...d.data, alertes: sos.data };
  });

  // Une alerte SOS arrive en direct
  useEffect(() => {
    const socket = getSocket();
    const surSos = (s) => {
      recharger();
      Alert.alert('🚨 Alerte SOS', `${s.nom} a déclenché une alerte.\n${s.lien}`);
    };
    socket?.on('sos:new', surSos);
    return () => socket?.off('sos:new', surSos);
  }, [recharger]);

  const resoudre = (s) =>
    Alert.alert('Clore cette alerte ?', `Confirmez que ${s.auteur?.nom || 'l’étudiant'} est en sécurité.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Alerte résolue',
        onPress: async () => {
          try {
            await api.patch(`/admin/sos/${s._id}/resolve`, { note: 'Situation vérifiée par l’administration' });
            recharger();
          } catch (err) {
            Alert.alert('Erreur', erreurApi(err));
          }
        },
      },
    ]);

  const quitter = () =>
    Alert.alert('Se déconnecter ?', '', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => deconnecter() },
    ]);

  if (chargement) return <Loader />;
  if (erreur) return <ErrorState text={erreur} onRetry={reessayer} />;

  const { utilisateurs: u, trajets: t, satisfaction: s, activite, topConducteurs, alertes } = data;
  const maxActivite = Math.max(1, ...activite.map((a) => a.trajetsPublies + a.trajetsTermines));

  return (
    <Screen
      header={
        <Header
          title="Administration"
          subtitle="UniRide · ISET Nabeul"
          variant="primary"
          right={
            <Row gap={8}>
              <IconButton icon="notifications-outline" tone="onPrimary" badge={nbNotifs} onPress={() => navigation.navigate('Notifications')} label="Notifications" />
              <IconButton icon="log-out-outline" tone="onPrimary" onPress={quitter} label="Se déconnecter" />
            </Row>
          }
        />
      }
      onRefresh={rafraichir}
      refreshing={rafraichissement}
      bottomInset={false}
    >
      {alertes.length ? (
        <Card style={{ borderColor: colors.danger, borderWidth: 2 }}>
          <Row style={{ marginBottom: spacing.md }}>
            <Ionicons name="alert-circle" size={22} color={colors.danger} />
            <Text style={[font.h3, { color: colors.danger }]}>
              {alertes.length} alerte{alertes.length > 1 ? 's' : ''} SOS en cours
            </Text>
          </Row>
          {alertes.map((a) => {
            const [lng, lat] = a.position?.coordinates || [];
            return (
              <View key={a._id} style={styles.sos}>
                <Row>
                  <Avatar uri={a.auteur?.photo} nom={a.auteur?.nom} size={38} />
                  <View style={{ flex: 1 }}>
                    <Text style={font.label}>{a.auteur?.nom || 'Utilisateur supprimé'}</Text>
                    <Text style={font.caption}>
                      {tempsRelatif(a.createdAt)}
                      {a.trajet ? ` · ${court(a.trajet.depart?.label)} → ${court(a.trajet.destination?.label)}` : ''}
                    </Text>
                  </View>
                </Row>
                {a.trajet?.conducteur ? (
                  <Text style={[font.caption, { marginTop: 6 }]}>
                    Conducteur : {a.trajet.conducteur.nom}
                    {a.trajet.conducteur.vehicule ? ` · ${a.trajet.conducteur.vehicule.marque} ${a.trajet.conducteur.vehicule.matricule}` : ''}
                  </Text>
                ) : null}
                <Row style={{ marginTop: spacing.md }}>
                  {lat ? <Button title="Carte" icon="map-outline" size="sm" variant="outline" style={{ flex: 1 }} onPress={() => Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`)} /> : null}
                  {a.auteur?.telephone ? <Button title="Appeler" icon="call-outline" size="sm" variant="secondary" style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${a.auteur.telephone}`)} /> : null}
                  <Button title="Résolue" icon="checkmark" size="sm" variant="success" style={{ flex: 1 }} onPress={() => resoudre(a)} />
                </Row>
              </View>
            );
          })}
        </Card>
      ) : null}

      <Text style={[font.overline, styles.groupe]}>Utilisateurs</Text>
      <Row gap={spacing.sm} style={{ marginBottom: spacing.sm }}>
        <StatTile icon="people-outline" value={u.total} label="Étudiants" />
        <StatTile icon="pulse-outline" tone="success" value={u.actifs7j} label="Actifs (7 j)" />
        <StatTile icon="person-add-outline" tone="info" value={`+${u.nouveaux7j}`} label="Nouveaux (7 j)" />
      </Row>
      <Row gap={spacing.sm} style={{ marginBottom: spacing.lg }}>
        <StatTile icon="car-outline" tone="accent" value={u.conducteurs} label="Conducteurs" />
        <StatTile icon="lock-closed-outline" value={u.bloques} label="Bloqués" />
        <StatTile icon="flag-outline" tone="accent" value={data.signalementsEnAttente} label="Signalements" />
      </Row>

      <Text style={[font.overline, styles.groupe]}>Trajets</Text>
      <Row gap={spacing.sm} style={{ marginBottom: spacing.sm }}>
        <StatTile icon="checkmark-done-outline" tone="success" value={t.effectues} label="Effectués" />
        <StatTile icon="calendar-outline" value={t.aVenir} label="À venir" />
        <StatTile icon="car-sport-outline" tone="info" value={t.enCours} label="En cours" />
      </Row>
      <Row gap={spacing.sm} style={{ marginBottom: spacing.lg }}>
        <StatTile icon="person-outline" value={t.passagersTransportes} label="Passagers" />
        <StatTile icon="leaf-outline" tone="success" value={`${nombre(data.co2EviteKg)} kg`} label="CO₂ évité" />
        <StatTile icon="close-circle-outline" value={t.annules} label="Annulés" />
      </Row>

      <Card>
        <Row style={{ justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <Text style={font.h3}>Taux de satisfaction</Text>
          <Text style={[font.h2, { color: s.taux >= 70 ? colors.success : colors.warning }]}>{s.taux} %</Text>
        </Row>
        <ProgressBar value={s.taux} color={s.taux >= 70 ? colors.success : colors.warning} />
        <Row style={{ justifyContent: 'space-between', marginTop: spacing.sm }}>
          <Text style={font.caption}>Avis notés 4 ou 5 étoiles</Text>
          <Stars value={s.noteMoyenne} count={s.nbAvis} size={12} />
        </Row>
      </Card>

      <Card>
        <Text style={font.h3}>Activité des 7 derniers jours</Text>
        <Row gap={12} style={{ marginTop: 4, marginBottom: spacing.md }}>
          <Legende couleur={colors.primary} label="Publiés" />
          <Legende couleur={colors.accent} label="Terminés" />
        </Row>
        <View style={styles.graphe}>
          {activite.map((a) => (
            <View key={a.date} style={styles.colonne}>
              <Text style={[font.caption, { fontSize: 10 }]}>{a.trajetsPublies + a.trajetsTermines || ''}</Text>
              <View style={[styles.barre, { height: `${(a.trajetsPublies / maxActivite) * 80}%`, backgroundColor: colors.primary }]} />
              <View style={[styles.barre, { height: `${(a.trajetsTermines / maxActivite) * 80}%`, backgroundColor: colors.accent, marginTop: 2 }]} />
              <Text style={[font.caption, { fontSize: 11, marginTop: 4 }]}>{a.jour.replace('.', '')}</Text>
            </View>
          ))}
        </View>
      </Card>

      <SectionTitle action="Utilisateurs" onAction={() => allerOnglet('utilisateurs')}>
        Conducteurs les plus actifs
      </SectionTitle>
      <Card padded={false}>
        {topConducteurs.length === 0 ? (
          <Text style={[font.small, { padding: spacing.lg }]}>Aucun trajet terminé pour le moment.</Text>
        ) : (
          topConducteurs.map((c, i) => (
            <Row key={c._id} style={[styles.top, i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderSoft }]}>
              <Text style={[font.h3, { width: 22, color: colors.muted }]}>{i + 1}</Text>
              <Avatar uri={c.photo} nom={c.nom} size={36} />
              <Text style={[font.label, { flex: 1 }]} numberOfLines={1}>
                {c.nom}
              </Text>
              <Stars value={c.noteMoyenne} size={12} />
              <Badge label={`${c.trajets} trajet${c.trajets > 1 ? 's' : ''}`} tone="primary" />
            </Row>
          ))
        )}
      </Card>
    </Screen>
  );
}

function Legende({ couleur, label }) {
  return (
    <Row gap={5}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: couleur }} />
      <Text style={font.caption}>{label}</Text>
    </Row>
  );
}

const styles = StyleSheet.create({
  groupe: { marginBottom: spacing.sm, marginLeft: 4 },
  sos: { backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  graphe: { flexDirection: 'row', height: 140, alignItems: 'flex-end', gap: 8 },
  colonne: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  barre: { width: '70%', borderRadius: 4, minHeight: 0 },
  top: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
});
