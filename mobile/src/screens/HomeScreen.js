import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import api from '../api';
import styles from '../styles';

export default function HomeScreen({ navigation, onLogout }) {
  const [user, setUser] = useState(null);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    const charger = () => {
      api
        .get('/auth/me')
        .then((res) => setUser(res.data))
        .catch(() => setErreur('Session expirée, reconnectez-vous'));
    };
    charger();
    const abonnement = navigation.addListener('focus', charger);
    return abonnement;
  }, [navigation]);

  return (
    <View style={styles.container}>
      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
      {!user && !erreur ? <ActivityIndicator size="large" /> : null}

      {user ? (
        <>
          <Text style={styles.titre}>Bonjour {user.nom} !</Text>
          <Text style={{ textAlign: 'center', marginBottom: 24 }}>
            {user.vehicule ? `Conducteur : ${user.vehicule.marque}` : 'Passager (aucun véhicule)'}
          </Text>
        </>
      ) : null}

      <TouchableOpacity style={styles.bouton} onPress={() => navigation.navigate('Profile')}>
        <Text style={styles.boutonTexte}>Mon profil</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.bouton} onPress={() => navigation.navigate('SearchRide')}>
  <Text style={styles.boutonTexte}>Chercher un trajet</Text>
</TouchableOpacity>
      <TouchableOpacity style={[styles.bouton, { marginTop: 12 }]} onPress={() => navigation.navigate('Vehicle')}>
        <Text style={styles.boutonTexte}>Mon véhicule</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.bouton, { marginTop: 12 }]} onPress={() => navigation.navigate('Schedule')}>
  <Text style={styles.boutonTexte}>Mon emploi du temps</Text>
</TouchableOpacity>
<TouchableOpacity style={[styles.bouton, { marginTop: 12 }]} onPress={() => navigation.navigate('MyRides')}>
  <Text style={styles.boutonTexte}>Mes trajets</Text>
</TouchableOpacity>
      <TouchableOpacity style={[styles.bouton, { marginTop: 12, backgroundColor: '#6b7280' }]} onPress={onLogout}>
        <Text style={styles.boutonTexte}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
}