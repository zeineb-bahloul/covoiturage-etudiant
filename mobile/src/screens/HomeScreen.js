import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import api from '../api';
import styles from '../styles';

export default function HomeScreen({ token, onLogout }) {
  const [user, setUser] = useState(null);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    api
      .get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setUser(res.data))
      .catch(() => setErreur('Session expirée, reconnectez-vous'));
  }, [token]);

  return (
    <View style={styles.container}>
      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
      {!user && !erreur ? <ActivityIndicator size="large" /> : null}

      {user ? (
        <>
          <Text style={styles.titre}>Bonjour {user.nom} !</Text>
          <Text style={{ textAlign: 'center', marginBottom: 24 }}>{user.email}</Text>
        </>
      ) : null}

      <TouchableOpacity style={styles.bouton} onPress={onLogout}>
        <Text style={styles.boutonTexte}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
}