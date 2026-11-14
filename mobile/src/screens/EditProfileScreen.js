import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import api from '../api';
import AddressPicker from '../components/AddressPicker';
import { Button, Card, Chip, Field, Header, Input, Loader, Row, Screen, SectionTitle, Toggle } from '../components/ui';
import { FILIERES } from './RegisterScreen';
import { erreurApi } from '../utils';

const MUSIQUES = [
  { valeur: 'aucune', label: 'Peu importe' },
  { valeur: 'calme', label: 'Calme' },
  { valeur: 'animee', label: 'Animée' },
];

/** Modifier le profil et les préférences (US3). */
export default function EditProfileScreen({ navigation }) {
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [nom, setNom] = useState('');
  const [filiere, setFiliere] = useState('');
  const [telephone, setTelephone] = useState('');
  const [domicile, setDomicile] = useState(null);
  const [nonFumeur, setNonFumeur] = useState(true);
  const [mixte, setMixte] = useState(true);
  const [musique, setMusique] = useState('aucune');

  useEffect(() => {
    api
      .get('/auth/me')
      .then(({ data }) => {
        setNom(data.nom);
        setFiliere(data.filiere || '');
        setTelephone(data.telephone || '');
        if (data.domicile) {
          const [lng, lat] = data.domicile.location.coordinates;
          setDomicile({ label: data.domicile.label, lat, lng });
        }
        setNonFumeur(data.preferences?.nonFumeur ?? true);
        setMixte(data.preferences?.mixte ?? true);
        setMusique(data.preferences?.musique || 'aucune');
      })
      .catch((err) => Alert.alert('Erreur', erreurApi(err)))
      .finally(() => setChargement(false));
  }, []);

  const enregistrer = async () => {
    if (nom.trim().length < 3) {
      Alert.alert('Nom requis', 'Indiquez votre nom complet.');
      return;
    }
    setEnvoi(true);
    try {
      await api.put('/users/me', {
        nom: nom.trim(),
        filiere,
        telephone,
        domicile: domicile ? { label: domicile.label, lat: domicile.lat, lng: domicile.lng } : null,
        preferences: { nonFumeur, mixte, musique },
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Enregistrement impossible', erreurApi(err));
    } finally {
      setEnvoi(false);
    }
  };

  if (chargement) return <Loader />;

  return (
    <Screen
      header={<Header title="Modifier mon profil" onBack={() => navigation.goBack()} />}
      footer={<Button title="Enregistrer" icon="checkmark" onPress={enregistrer} loading={envoi} />}
      keyboard
    >
      <Card>
        <Input label="Nom complet" icon="person-outline" value={nom} onChangeText={setNom} />
        <Input label="Téléphone (facultatif)" icon="call-outline" value={telephone} onChangeText={setTelephone} keyboardType="phone-pad" placeholder="Ex : 22 123 456" />
        <Field label="Filière" style={{ marginBottom: 0 }}>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {FILIERES.map((f) => (
              <Chip key={f} label={f} selected={filiere === f} onPress={() => setFiliere(f)} />
            ))}
          </Row>
        </Field>
      </Card>

      <SectionTitle>Adresse approximative</SectionTitle>
      <Card>
        <AddressPicker
          label="Quartier ou ville de départ"
          valeur={domicile}
          onChoisir={setDomicile}
          placeholder="Ex : Dar Chaabane, Nabeul"
          icon="home-outline"
        />
        <View style={{ marginTop: -8 }}>
          <Field hint="Seule une adresse approximative est nécessaire : elle sert à calculer la proximité avec les conducteurs (35 % du score)." style={{ marginBottom: 0 }} />
        </View>
      </Card>

      <SectionTitle>Mes préférences de trajet</SectionTitle>
      <Card>
        <Toggle icon="ban-outline" label="Non-fumeur" description="Je préfère un véhicule sans tabac" value={nonFumeur} onChange={setNonFumeur} />
        <Toggle icon="people-outline" label="Trajets mixtes acceptés" description="Filles et garçons dans le même véhicule" value={mixte} onChange={setMixte} />
        <Field label="Ambiance musicale" style={{ marginTop: 8, marginBottom: 0 }}>
          <Row gap={8}>
            {MUSIQUES.map((m) => (
              <Chip key={m.valeur} label={m.label} selected={musique === m.valeur} onPress={() => setMusique(m.valeur)} />
            ))}
          </Row>
        </Field>
      </Card>
    </Screen>
  );
}
