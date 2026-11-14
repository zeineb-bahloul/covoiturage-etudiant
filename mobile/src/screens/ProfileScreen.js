import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import api from '../api';
import { Avatar, Badge, Card, ErrorState, Header, Ionicons, ListItem, Loader, Row, Screen, Stars } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useDonnees } from '../hooks';
import { colors, font, spacing } from '../theme';
import { MUSIQUE, court, erreurApi } from '../utils';

/** Onglet Profil (US3, US4). */
export default function ProfileScreen({ navigation }) {
  const { deconnecter } = useAuth();
  const [photoEnvoi, setPhotoEnvoi] = useState(false);
  const { data, setData, chargement, erreur, rafraichir, rafraichissement, reessayer } = useDonnees(async () => {
    const [user, stats, schedule] = await Promise.all([
      api.get('/auth/me').then((r) => r.data),
      api.get('/stats/me').then((r) => r.data).catch(() => null),
      api.get('/schedule/me').then((r) => r.data).catch(() => ({ jours: [] })),
    ]);
    return { user, stats, schedule };
  });

  const changerPhoto = async () => {
    const choix = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (choix.canceled) return;
    setPhotoEnvoi(true);
    try {
      const reduite = await ImageManipulator.manipulateAsync(choix.assets[0].uri, [{ resize: { width: 300 } }], {
        compress: 0.6,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      });
      const photo = `data:image/jpeg;base64,${reduite.base64}`;
      await api.put('/users/me/photo', { photo });
      setData((d) => ({ ...d, user: { ...d.user, photo } }));
    } catch (err) {
      Alert.alert('Photo non enregistrée', erreurApi(err));
    } finally {
      setPhotoEnvoi(false);
    }
  };

  const seDeconnecter = () =>
    Alert.alert('Se déconnecter ?', 'Vous devrez saisir à nouveau votre mot de passe.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: deconnecter },
    ]);

  if (chargement) return <Loader />;
  if (erreur) return <ErrorState text={erreur} onRetry={reessayer} />;

  const { user, stats, schedule } = data;
  const pref = user.preferences || {};
  const nbBadges = (stats?.badges || []).filter((b) => b.debloque).length;

  return (
    <Screen header={<Header title="Mon profil" />} onRefresh={rafraichir} refreshing={rafraichissement} bottomInset={false}>
      <Card style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
        <Pressable onPress={changerPhoto} disabled={photoEnvoi}>
          <Avatar uri={user.photo} nom={user.nom} size={92} />
          <View style={styles.camera}>
            {photoEnvoi ? <ActivityIndicator size="small" color={colors.ink} /> : <Ionicons name="camera" size={16} color={colors.ink} />}
          </View>
        </Pressable>
        <Text style={[font.h2, { marginTop: spacing.md }]}>{user.nom}</Text>
        <Text style={font.small}>{user.filiere || 'Filière non renseignée'}</Text>
        <View style={{ marginTop: 6 }}>
          <Stars value={user.noteMoyenne} count={user.nombreAvis} />
        </View>

        <Row style={styles.chiffres} gap={0}>
          <Chiffre valeur={stats?.trajetsEffectues ?? 0} label="Trajets" />
          <View style={styles.sep} />
          <Chiffre valeur={user.nombreAvis || 0} label="Avis" />
          <View style={styles.sep} />
          <Chiffre valeur={nbBadges} label="Badges" />
        </Row>

        <Row gap={6} style={{ flexWrap: 'wrap', justifyContent: 'center', marginTop: spacing.md }}>
          <Badge icon={pref.nonFumeur ? 'ban-outline' : 'flame-outline'} label={pref.nonFumeur ? 'Non-fumeur' : 'Fumeur'} />
          <Badge icon="musical-notes-outline" label={MUSIQUE[pref.musique] || MUSIQUE.aucune} />
          <Badge icon="people-outline" label={pref.mixte ? 'Trajets mixtes' : 'Non mixte'} />
        </Row>
      </Card>

      <Text style={[font.overline, styles.groupe]}>Mon compte</Text>
      <Card padded={false}>
        <ListItem icon="person-outline" title="Modifier mon profil" subtitle={user.domicile ? court(user.domicile.label) : 'Adresse non renseignée'} onPress={() => navigation.navigate('EditProfile')} />
        <ListItem
          icon="calendar-outline"
          title="Mon emploi du temps"
          subtitle={schedule.jours.length ? `${schedule.jours.length} jour(s) de cours` : 'À importer pour le matching'}
          onPress={() => navigation.navigate('Schedule')}
        />
        <ListItem
          icon="car-outline"
          title="Mon véhicule"
          subtitle={user.vehicule ? `${user.vehicule.marque} · ${user.vehicule.places} places` : 'Ajoutez-le pour devenir conducteur'}
          onPress={() => navigation.navigate('Vehicle')}
        />
      </Card>

      <Text style={[font.overline, styles.groupe]}>Activité</Text>
      <Card padded={false}>
        <ListItem icon="stats-chart-outline" iconTone="success" title="Statistiques et badges" subtitle="Argent économisé, CO₂ évité" onPress={() => navigation.navigate('Stats')} />
        <ListItem icon="star-outline" iconTone="accent" title="Noter mes covoitureurs" onPress={() => navigation.navigate('RateRide')} />
        <ListItem icon="notifications-outline" iconTone="info" title="Notifications" onPress={() => navigation.navigate('Notifications')} />
      </Card>

      <Card padded={false}>
        <ListItem icon="log-out-outline" title="Se déconnecter" danger onPress={seDeconnecter} right={null} />
      </Card>
      <Text style={[font.caption, { textAlign: 'center' }]}>{user.email}</Text>
    </Screen>
  );
}

function Chiffre({ valeur, label }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={[font.h2, { fontSize: 20 }]}>{valeur}</Text>
      <Text style={font.caption}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  camera: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  chiffres: { marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderSoft, alignSelf: 'stretch' },
  sep: { width: 1, height: 30, backgroundColor: colors.borderSoft },
  groupe: { marginTop: spacing.sm, marginBottom: spacing.sm, marginLeft: 4 },
});
