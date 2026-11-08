import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api';
import styles from '../styles';

function quand(trajet) {
  if (trajet.recurrent) {
    return `Chaque ${trajet.jours.join(', ')}`;
  }
  return `Le ${new Date(trajet.date).toISOString().slice(0, 10)}`;
}

export default function MyRidesScreen({ navigation }) {
  const [trajets, setTrajets] = useState([]);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(() => {
    api
      .get('/rides/mine')
      .then(({ data }) => setTrajets(data))
      .catch(() => Alert.alert('Erreur', 'Impossible de charger vos trajets'))
      .finally(() => setChargement(false));
  }, []);

  useFocusEffect(charger);

  const annuler = (id) => {
    Alert.alert('Annuler ce trajet ?', 'Les passagers ne pourront plus le réserver.', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui, annuler',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/rides/${id}`);
            setTrajets((avant) => avant.filter((t) => t._id !== id));
          } catch (err) {
            Alert.alert('Erreur', 'Annulation impossible');
          }
        },
      },
    ]);
  };

  if (chargement) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <FlatList
        data={trajets}
        keyExtractor={(t) => t._id}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 40 }}>Vous n'avez publié aucun trajet.</Text>
        }
        renderItem={({ item }) => (
          <View style={{ padding: 14, borderRadius: 10, backgroundColor: '#f3f4f6', marginBottom: 12 }}>
            <Text style={{ fontWeight: 'bold' }}>
              {item.depart.label} → {item.destination.label}
            </Text>
            <Text style={{ marginTop: 4 }}>{quand(item)}</Text>
            <Text>
              {item.heureDepart} → {item.heureArrivee} ({item.distanceKm} km)
            </Text>
            <Text>
              {item.places} place(s) · {item.prix} DT par passager
            </Text>
            <Text style={{ color: '#dc2626', marginTop: 8 }} onPress={() => annuler(item._id)}>
              Annuler ce trajet
            </Text>
          </View>
        )}
      />

      <TouchableOpacity style={styles.bouton} onPress={() => navigation.navigate('PublishRide')}>
        <Text style={styles.boutonTexte}>Publier un nouveau trajet</Text>
      </TouchableOpacity>
    </View>
  );
}