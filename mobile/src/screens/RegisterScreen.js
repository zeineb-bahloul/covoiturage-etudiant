import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import api from '../api';
import AuthLayout from '../components/AuthLayout';
import { Button, Chip, Field, Input, Notice, Row } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { colors, font } from '../theme';
import { erreurApi } from '../utils';

export const FILIERES = [
  'Technologies de l’Informatique',
  'Génie Électrique',
  'Génie Mécanique',
  'Génie des Procédés',
  'Gestion',
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen({ navigation }) {
  const { connecter } = useAuth();
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [filiere, setFiliere] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreurs, setErreurs] = useState({});
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const valider = () => {
    const e = {};
    if (nom.trim().length < 3) e.nom = 'Indiquez votre nom complet';
    if (!EMAIL.test(email.trim())) e.email = 'Adresse e-mail invalide';
    if (!filiere) e.filiere = 'Choisissez votre filière';
    if (motDePasse.length < 6) e.motDePasse = '6 caractères minimum';
    if (confirmation !== motDePasse) e.confirmation = 'Les mots de passe ne correspondent pas';
    setErreurs(e);
    return Object.keys(e).length === 0;
  };

  const sInscrire = async () => {
    setErreur('');
    if (!valider()) return;
    setEnvoi(true);
    try {
      const { data } = await api.post('/auth/register', {
        nom: nom.trim(),
        email: email.trim().toLowerCase(),
        motDePasse,
        filiere,
      });
      await connecter(data.token);
    } catch (err) {
      setErreur(erreurApi(err, 'Création du compte impossible'));
      setEnvoi(false);
    }
  };

  return (
    <AuthLayout
      titre="Créer un compte"
      sousTitre="Rejoignez la communauté de covoiturage de l'ISET Nabeul."
      onBack={() => navigation.goBack()}
      pied={
        <Row style={{ justifyContent: 'center' }} gap={4}>
          <Text style={font.small}>Déjà inscrit ?</Text>
          <Pressable onPress={() => navigation.popTo('Login')} hitSlop={8}>
            <Text style={{ color: colors.primary, fontWeight: '800' }}>Se connecter</Text>
          </Pressable>
        </Row>
      }
    >
      {erreur ? <Notice tone="danger" icon="alert-circle-outline" text={erreur} /> : null}

      <Input label="Nom complet" icon="person-outline" placeholder="Ex : Sara Mansour" value={nom} onChangeText={setNom} error={erreurs.nom} autoComplete="name" />
      <Input
        label="E-mail universitaire"
        icon="mail-outline"
        placeholder="prenom.nom@isetn.tn"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        error={erreurs.email}
      />
      <Field label="Filière" error={erreurs.filiere}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {FILIERES.map((f) => (
            <Chip key={f} label={f} selected={filiere === f} onPress={() => setFiliere(f)} />
          ))}
        </View>
      </Field>
      <Input label="Mot de passe" icon="lock-closed-outline" placeholder="6 caractères minimum" value={motDePasse} onChangeText={setMotDePasse} secure error={erreurs.motDePasse} />
      <Input
        label="Confirmer le mot de passe"
        icon="lock-closed-outline"
        placeholder="Retapez le mot de passe"
        value={confirmation}
        onChangeText={setConfirmation}
        secure
        error={erreurs.confirmation}
      />

      <Button title="Créer mon compte" onPress={sInscrire} loading={envoi} style={{ marginTop: 4 }} />
    </AuthLayout>
  );
}
