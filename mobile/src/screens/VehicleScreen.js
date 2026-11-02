import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import api from '../api';
import styles from '../styles';

export default function VehicleScreen({ navigation }) {
  const [marque, setMarque] = useState('');
  const [places, setPlaces] = useState('');
  const [matricule, setMatricule] = useState('');
  const [existe, setExiste] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    api
      .get('/auth/me')
      .then(({ data }) => {
        if (data.vehicule) {
          setMarque(data.vehicule.marque);
          setPlaces(String(data.vehicule.places));
          setMatricule(data.vehicule.matricule);
          setExiste(true);
        }
      })
      .catch(() => Alert.alert('Erreur', 'Impossible de charger le véhicule'))
      .finally(() => setChargement(false));
  }, []);

  const enregistrer = async () => {
    if (!marque.trim() || !places || !matricule.trim()) {
      Alert.alert('Attention', 'Remplissez tous les champs');
      return;
    }
    setEnvoi(true);
    try {
      await api.put('/users/me/vehicule', { marque, places: Number(places), matricule });
      Alert.alert('Succès', 'Véhicule enregistré', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message || 'Impossible de joindre le serveur');
    } finally {
      setEnvoi(false);
    }
  };

  const supprimer = () => {
    Alert.alert('Supprimer', 'Retirer votre véhicule ? Vous redeviendrez simple passager.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete('/users/me/vehicule');
            navigation.goBack();
          } catch (err) {
            Alert.alert('Erreur', 'Suppression impossible');
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
    <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
      <Text style={{ textAlign: 'center', marginBottom: 20 }}>
        Ajoutez votre véhicule pour pouvoir publier des trajets.
      </Text>

      <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Marque et modèle</Text>
      <TextInput style={styles.input} value={marque} onChangeText={setMarque} placeholder="Ex : Peugeot 208" />

      <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Nombre de places pour les passagers (1 à 8)</Text>
      <TextInput
        style={styles.input}
        value={places}
        onChangeText={setPlaces}
        keyboardType="number-pad"
        placeholder="Ex : 3"
      />

      <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Matricule</Text>
      <TextInput
        style={styles.input}
        value={matricule}
        onChangeText={setMatricule}
        autoCapitalize="characters"
        placeholder="Ex : 123 TUN 4567"
      />

      <TouchableOpacity style={styles.bouton} onPress={enregistrer} disabled={envoi}>
        {envoi ? <ActivityIndicator color="#fff" /> : <Text style={styles.boutonTexte}>Enregistrer</Text>}
      </TouchableOpacity>

      {existe ? (
        <TouchableOpacity style={[styles.bouton, { backgroundColor: '#dc2626', marginTop: 12 }]} onPress={supprimer}>
          <Text style={styles.boutonTexte}>Supprimer mon véhicule</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}