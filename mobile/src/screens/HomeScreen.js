import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import api from '../api';
import RideCard from '../components/RideCard';
import { Avatar, Card, EmptyState, ErrorState, IconButton, Ionicons, Loader, Notice, Row, SectionTitle, StatTile } from '../components/ui';
import { useRealtime } from '../context/AuthContext';
import { useDonnees } from '../hooks';
import { colors, font, radius, shadow, spacing } from '../theme';
import { court, nombre, prenom } from '../utils';

async function chargerAccueil() {
  const ignorer = (p, defaut) => p.then((r) => r.data).catch(() => defaut);
  const [user, suggestions, stats, schedule, aNoter, reservations, mesTrajets] = await Promise.all([
    api.get('/auth/me').then((r) => r.data),
    ignorer(api.get('/rides/suggestions'), []),
    ignorer(api.get('/stats/me'), null),
    ignorer(api.get('/schedule/me'), { jours: [] }),
    ignorer(api.get('/reviews/a-noter'), []),
    ignorer(api.get('/bookings/my'), []),
    ignorer(api.get('/rides/mine'), []),
  ]);

  // Trajet en cours (conducteur ou passager) ou prochain trajet confirmé
  const enCoursConducteur = mesTrajets.find((t) => t.statut === 'en_cours');
  const enCoursPassager = reservations.find((b) => b.statut === 'acceptee' && b.trajet?.statut === 'en_cours');
  const enCours = enCoursConducteur || enCoursPassager?.trajet || null;
  const demandes = mesTrajets.reduce((s, t) => s + (t.demandesEnAttente || 0), 0);

  return { user, suggestions, stats, schedule, aNoter, enCours, demandes };
}

export default function HomeScreen({ navigation, allerOnglet }) {
  const insets = useSafeAreaInsets();
  const { nbNotifs } = useRealtime();
  const { data, chargement, erreur, rafraichissement, rafraichir, reessayer } = useDonnees(chargerAccueil);

  if (chargement) return <Loader />;
  if (erreur) return <ErrorState text={erreur} onRetry={reessayer} />;

  const { user, suggestions, stats, schedule, aNoter, enCours, demandes } = data;
  const sansAdresse = !user.domicile;
  const sansPlanning = !schedule?.jours?.length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
      refreshControl={<RefreshControl refreshing={rafraichissement} onRefresh={rafraichir} colors={[colors.primary]} tintColor={colors.white} />}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar style="light" />
      {/* En-tête */}
      <View style={[styles.hero, { paddingTop: insets.top + spacing.md }]}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable onPress={() => allerOnglet('profil')}>
            <Row gap={spacing.md}>
              <Avatar uri={user.photo} nom={user.nom} size={46} style={{ borderWidth: 2, borderColor: colors.accent }} />
              <View>
                <Text style={styles.bonjour}>Bonjour,</Text>
                <Text style={styles.nom}>{prenom(user.nom)}</Text>
              </View>
            </Row>
          </Pressable>
          <IconButton icon="notifications-outline" tone="onPrimary" badge={nbNotifs} onPress={() => navigation.navigate('Notifications')} label="Notifications" />
        </Row>

        <Text style={styles.question}>Où allez-vous aujourd'hui ?</Text>

        <Pressable onPress={() => allerOnglet('recherche')} style={styles.recherche}>
          <Ionicons name="search" size={20} color={colors.muted} />
          <Text style={styles.rechercheTexte}>Rechercher un trajet vers l'ISET…</Text>
        </Pressable>
        <Row gap={spacing.sm} style={{ marginTop: spacing.sm }}>
          <Pressable style={[styles.action, { backgroundColor: colors.accent }]} onPress={() => navigation.navigate(user.vehicule ? 'PublishRide' : 'Vehicle')}>
            <Ionicons name="add-circle" size={18} color={colors.ink} />
            <Text style={[styles.actionTexte, { color: colors.ink }]}>Publier un trajet</Text>
          </Pressable>
          <Pressable style={styles.action} onPress={() => navigation.navigate('Schedule')}>
            <Ionicons name="calendar" size={17} color={colors.white} />
            <Text style={styles.actionTexte}>Mon planning</Text>
          </Pressable>
        </Row>
      </View>

      <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.lg }}>
        {enCours ? (
          <Card onPress={() => navigation.navigate('ActiveRide', { id: enCours._id })} style={styles.enCours}>
            <Row>
              <View style={styles.pulse}>
                <Ionicons name="car-sport" size={20} color={colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[font.label, { color: colors.white }]}>Trajet en cours</Text>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }} numberOfLines={1}>
                  {court(enCours.depart?.label)} → {court(enCours.destination?.label)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.white} />
            </Row>
          </Card>
        ) : null}

        {demandes > 0 ? (
          <Notice
            tone="info"
            icon="person-add-outline"
            title={`${demandes} demande${demandes > 1 ? 's' : ''} de réservation`}
            text="Des étudiants veulent rejoindre vos trajets."
            action="Répondre"
            onAction={() => navigation.navigate('BookingRequests')}
          />
        ) : null}

        {aNoter.length > 0 ? (
          <Notice
            tone="accent"
            icon="star-outline"
            title="Comment s'est passé votre trajet ?"
            text={`Notez ${aNoter[0].cible.nom}${aNoter.length > 1 ? ` et ${aNoter.length - 1} autre(s)` : ''} pour renforcer la confiance.`}
            action="Noter maintenant"
            onAction={() => navigation.navigate('RateRide')}
          />
        ) : null}

        {(sansAdresse || sansPlanning) && (
          <Notice
            tone="warning"
            icon="sparkles-outline"
            title="Améliorez vos suggestions"
            text={
              sansAdresse && sansPlanning
                ? 'Ajoutez votre adresse et votre emploi du temps pour un score de compatibilité précis.'
                : sansAdresse
                ? 'Ajoutez votre adresse pour calculer la proximité avec les conducteurs.'
                : 'Importez votre emploi du temps pour comparer les horaires.'
            }
            action={sansAdresse ? 'Ajouter mon adresse' : 'Mon emploi du temps'}
            onAction={() => navigation.navigate(sansAdresse ? 'EditProfile' : 'Schedule')}
          />
        )}

        <Row gap={spacing.sm} style={{ marginBottom: spacing.lg }}>
          <StatTile icon="leaf-outline" tone="success" value={`${nombre(stats?.co2Economise)} kg`} label="CO₂ évité" />
          <StatTile icon="wallet-outline" tone="accent" value={`${nombre(stats?.argentEconomise)} DT`} label="Économisés" />
          <StatTile icon="car-outline" value={stats?.trajetsEffectues ?? 0} label="Trajets" />
        </Row>

        <SectionTitle action={suggestions.length ? 'Tout voir' : null} onAction={() => allerOnglet('recherche')}>
          Suggestions pour vous
        </SectionTitle>
        {suggestions.length === 0 ? (
          <Card>
            <EmptyState
              icon="sparkles-outline"
              title="Pas encore de suggestion"
              text="Aucun conducteur ne propose de trajet à venir pour le moment. Revenez plus tard ou lancez une recherche."
              action="Rechercher un trajet"
              onAction={() => allerOnglet('recherche')}
            />
          </Card>
        ) : (
          suggestions.map((r) => <RideCard key={r._id} ride={r} onPress={() => navigation.navigate('RideDetail', { id: r._id })} />)
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.xl + 6,
    borderBottomRightRadius: radius.xl + 6,
  },
  bonjour: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  nom: { color: colors.white, fontSize: 19, fontWeight: '800' },
  question: { color: colors.white, fontSize: 23, fontWeight: '800', marginTop: spacing.xl, marginBottom: spacing.md, letterSpacing: -0.3 },
  recherche: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    ...shadow.card,
  },
  rechercheTexte: { color: colors.muted, fontSize: 15 },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  actionTexte: { color: colors.white, fontWeight: '700', fontSize: 14 },
  enCours: { backgroundColor: colors.success, borderColor: colors.success },
  pulse: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
});
