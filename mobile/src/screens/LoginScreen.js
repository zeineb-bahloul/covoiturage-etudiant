import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import api from '../api';
import AuthLayout from '../components/AuthLayout';
import { Button, Input, Notice, Row } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { colors, font } from '../theme';
import { erreurApi } from '../utils';

export default function LoginScreen({ navigation, route }) {
  const { connecter } = useAuth();
  const [email, setEmail] = useState(route.params?.email || '');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);

  const seConnecter = async () => {
    setErreur('');
    if (!email.trim() || !motDePasse) {
      setErreur('Renseignez votre e-mail et votre mot de passe.');
      return;
    }
    setChargement(true);
    try {
      const { data } = await api.post('/auth/login', { email: email.trim().toLowerCase(), motDePasse });
      await connecter(data.token);
    } catch (err) {
      setErreur(erreurApi(err));
      setChargement(false);
    }
  };

  return (
    <AuthLayout
      titre="Bon retour !"
      sousTitre="Connectez-vous pour retrouver vos trajets."
      onBack={navigation.canGoBack() ? () => navigation.goBack() : null}
      pied={
        <Row style={{ justifyContent: 'center' }} gap={4}>
          <Text style={font.small}>Pas encore de compte ?</Text>
          <Pressable onPress={() => navigation.popTo('Register')} hitSlop={8}>
            <Text style={{ color: colors.primary, fontWeight: '800' }}>S'inscrire</Text>
          </Pressable>
        </Row>
      }
    >
      {route.params?.message ? <Notice tone="success" icon="checkmark-circle-outline" text={route.params.message} /> : null}
      {erreur ? <Notice tone="danger" icon="alert-circle-outline" text={erreur} /> : null}

      <Input
        label="E-mail universitaire"
        icon="mail-outline"
        placeholder="prenom.nom@isetn.tn"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <Input
        label="Mot de passe"
        icon="lock-closed-outline"
        placeholder="Votre mot de passe"
        value={motDePasse}
        onChangeText={setMotDePasse}
        secure
        onSubmitEditing={seConnecter}
        returnKeyType="go"
        style={{ marginBottom: 8 }}
      />
      <View style={{ alignItems: 'flex-end', marginBottom: 24 }}>
        <Pressable onPress={() => navigation.navigate('ForgotPassword', { email })} hitSlop={8}>
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>Mot de passe oublié ?</Text>
        </Pressable>
      </View>

      <Button title="Se connecter" onPress={seConnecter} loading={chargement} />
    </AuthLayout>
  );
}
