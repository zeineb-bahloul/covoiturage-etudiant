import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import api from '../api';
import { Button, Card, Header, Ionicons, ListItem, Notice, Screen } from '../components/ui';
import { colors, font, spacing } from '../theme';
import { erreurApi } from '../utils';

// Numéros d'urgence en Tunisie
const URGENCES = [
  { numero: '197', label: 'Police secours', icone: 'shield-outline' },
  { numero: '190', label: 'SAMU (urgence médicale)', icone: 'medkit-outline' },
  { numero: '198', label: 'Protection civile', icone: 'flame-outline' },
];

function ouvrirSms(telephone, texte) {
  const sep = Platform.OS === 'ios' ? '&' : '?';
  return Linking.openURL(`sms:${telephone}${sep}body=${encodeURIComponent(texte)}`);
}

/** Bouton SOS : position envoyée au contact de confiance et à l'administration (US22). */
export default function SosScreen({ route, navigation }) {
  const trajetId = route.params?.trajetId;
  const [contact, setContact] = useState(null);
  const [etat, setEtat] = useState('pret'); // pret | envoi | envoye
  const [lien, setLien] = useState('');
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    api
      .get('/auth/me')
      .then(({ data }) => setContact(data.contactConfiance?.telephone ? data.contactConfiance : false))
      .catch(() => setContact(false));
  }, []);

  const declencher = async () => {
    setEtat('envoi');
    setErreur('');
    let position = null;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        position = p.coords;
      }
    } catch {
      /* GPS indisponible : l'alerte part quand même */
    }
    try {
      const { data } = await api.post('/sos', {
        lat: position?.latitude,
        lng: position?.longitude,
        precision: position?.accuracy,
        trajetId,
      });
      setLien(data.lien);
      setEtat('envoye');
      if (contact) {
        const texte = `🚨 SOS UniRide : j'ai besoin d'aide pendant mon covoiturage. Ma position : ${data.lien}`;
        ouvrirSms(contact.telephone, texte).catch(() => {});
      }
      if (!position) setErreur("Position GPS indisponible : l'alerte a été envoyée sans localisation.");
    } catch (err) {
      setEtat('pret');
      Alert.alert('Alerte non envoyée', `${erreurApi(err)}\n\nAppelez directement le 197.`);
    }
  };

  const confirmer = () =>
    Alert.alert("Déclencher l'alerte SOS ?", 'Votre position sera envoyée à l’administration' + (contact ? ` et à ${contact.nom || 'votre contact'} par SMS.` : '.'), [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Envoyer le SOS', style: 'destructive', onPress: declencher },
    ]);

  return (
    <Screen header={<Header title="Urgence" subtitle="Bouton SOS" onBack={() => navigation.goBack()} />}>
      {etat === 'envoye' ? (
        <Notice tone="success" icon="checkmark-circle-outline" title="Alerte envoyée" text="L'administration d'UniRide a été prévenue avec votre position." />
      ) : null}
      {erreur ? <Notice tone="warning" text={erreur} /> : null}

      <View style={styles.centre}>
        <Pressable onPress={confirmer} disabled={etat === 'envoi'} style={({ pressed }) => [styles.sos, pressed && { transform: [{ scale: 0.96 }] }]}>
          {etat === 'envoi' ? (
            <ActivityIndicator color={colors.white} size="large" />
          ) : (
            <>
              <Ionicons name="alert" size={44} color={colors.white} />
              <Text style={styles.sosTexte}>SOS</Text>
            </>
          )}
        </Pressable>
        <Text style={[font.small, { textAlign: 'center', marginTop: spacing.lg }]}>
          {etat === 'envoye' ? 'Vous pouvez renvoyer une alerte si besoin.' : 'Touchez le bouton en cas de danger pendant un trajet.'}
        </Text>
      </View>

      {contact === false ? (
        <Notice
          tone="warning"
          icon="person-add-outline"
          title="Aucun contact de confiance"
          text="Ajoutez un proche : il recevra votre position par SMS lors d'une alerte."
          action="Ajouter un contact"
          onAction={() => navigation.navigate('EditProfile')}
        />
      ) : contact ? (
        <Card padded={false}>
          <ListItem
            icon="chatbubble-ellipses-outline"
            iconTone="danger"
            title={`Envoyer ma position à ${contact.nom || 'mon contact'}`}
            subtitle={contact.telephone}
            onPress={() => ouvrirSms(contact.telephone, `🚨 SOS UniRide : j'ai besoin d'aide. ${lien ? `Ma position : ${lien}` : ''}`)}
          />
        </Card>
      ) : null}

      <Text style={[font.overline, { marginTop: spacing.sm, marginBottom: spacing.sm }]}>Numéros d'urgence</Text>
      <Card padded={false}>
        {URGENCES.map((u) => (
          <ListItem
            key={u.numero}
            icon={u.icone}
            iconTone="danger"
            title={`${u.numero} — ${u.label}`}
            onPress={() => Linking.openURL(`tel:${u.numero}`)}
            right={<Ionicons name="call" size={20} color={colors.danger} />}
          />
        ))}
      </Card>
      <Button title="Retour au trajet" variant="outline" onPress={() => navigation.goBack()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: 'center', paddingVertical: spacing.xl },
  sos: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 10,
    borderColor: colors.dangerSoft,
  },
  sosTexte: { color: colors.white, fontSize: 30, fontWeight: '900', letterSpacing: 2 },
});
