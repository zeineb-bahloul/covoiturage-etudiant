import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import api from '../api';
import styles from '../styles';

export default function RegisterScreen({ navigation }) {
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [filiere, setFiliere] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const sInscrire = async () => {
    setErreur('');
    if (!nom || !email || !motDePasse) {
      setErreur('Nom, e-mail et mot de passe sont obligatoires');
      return;
    }
    setEnvoi(true);
    try {
      await api.post('/auth/register', { nom, email, motDePasse, filiere });
      Alert.alert('Compte créé', 'Vous pouvez maintenant vous connecter', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err) {
      setErreur(err.response?.data?.message || 'Impossible de joindre le serveur');
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titre}>Créer un compte</Text>

      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}

      <TextInput style={styles.input} placeholder="Nom complet" value={nom} onChangeText={setNom} />
      <TextInput
        style={styles.input}
        placeholder="E-mail universitaire"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput style={styles.input} placeholder="Filière (ex : DSI)" value={filiere} onChangeText={setFiliere} />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe (6 caractères minimum)"
        value={motDePasse}
        onChangeText={setMotDePasse}
        secureTextEntry
      />

      <TouchableOpacity style={styles.bouton} onPress={sInscrire} disabled={envoi}>
        {envoi ? <ActivityIndicator color="#fff" /> : <Text style={styles.boutonTexte}>S'inscrire</Text>}
      </TouchableOpacity>
    </View>
  );
}