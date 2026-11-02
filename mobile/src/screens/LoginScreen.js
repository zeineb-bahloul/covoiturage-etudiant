import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import api from '../api';
import styles from '../styles';

export default function LoginScreen({ navigation, onLogin }) {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const seConnecter = async () => {
    setErreur('');
    if (!email || !motDePasse) {
      setErreur('Remplissez tous les champs');
      return;
    }
    setEnvoi(true);
    try {
      const { data } = await api.post('/auth/login', { email, motDePasse });
      await onLogin(data.token);
    } catch (err) {
      setErreur(err.response?.data?.message || 'Impossible de joindre le serveur');
      setEnvoi(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titre}>Covoiturage étudiant</Text>

      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="E-mail universitaire"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        value={motDePasse}
        onChangeText={setMotDePasse}
        secureTextEntry
      />

      <TouchableOpacity style={styles.bouton} onPress={seConnecter} disabled={envoi}>
        {envoi ? <ActivityIndicator color="#fff" /> : <Text style={styles.boutonTexte}>Se connecter</Text>}
      </TouchableOpacity>

      <Text style={styles.lien} onPress={() => navigation.navigate('Register')}>
        Pas de compte ? S'inscrire
      </Text>
    </View>
  );
}