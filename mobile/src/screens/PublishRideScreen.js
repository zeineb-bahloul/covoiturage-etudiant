import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, Switch, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import api from '../api';
import styles from '../styles';
import AddressPicker from '../components/AddressPicker';

const JOURS = [
  { cle: 'lundi', label: 'Lun' },
  { cle: 'mardi', label: 'Mar' },
  { cle: 'mercredi', label: 'Mer' },
  { cle: 'jeudi', label: 'Jeu' },
  { cle: 'vendredi', label: 'Ven' },
  { cle: 'samedi', label: 'Sam' },
];

const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function PublishRideScreen({ navigation }) {
  const [depart, setDepart] = useState(null);
  const [destination, setDestination] = useState(null);
  const [heure, setHeure] = useState('');
  const [places, setPlaces] = useState('');
  const [prix, setPrix] = useState('');
  const [recurrent, setRecurrent] = useState(true);
  const [jours, setJours] = useState([]);
  const [date, setDate] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const basculerJour = (cle) => {
    setJours((avant) => (avant.includes(cle) ? avant.filter((j) => j !== cle) : [...avant, cle]));
  };

  const publier = async () => {
    if (!depart || !destination) {
      Alert.alert('Attention', 'Choisissez le départ et la destination');
      return;
    }
    if (!HEURE.test(heure)) {
      Alert.alert('Attention', "Heure de départ au format HH:MM (ex : 07:45)");
      return;
    }
    if (!places || prix === '') {
      Alert.alert('Attention', 'Indiquez le nombre de places et le prix');
      return;
    }
    if (recurrent && jours.length === 0) {
      Alert.alert('Attention', 'Choisissez au moins un jour');
      return;
    }
    if (!recurrent && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert('Attention', 'Date au format AAAA-MM-JJ (ex : 2026-11-10)');
      return;
    }

    setEnvoi(true);
    try {
      const { data } = await api.post('/rides', {
        depart,
        destination,
        heureDepart: heure,
        places: Number(places),
        prix: Number(prix.replace(',', '.')),
        recurrent,
        jours: recurrent ? jours : [],
        date: recurrent ? undefined : date,
      });
      Alert.alert(
        'Trajet publié',
        `${data.distanceKm} km, environ ${data.dureeMin} min. Arrivée prévue à ${data.heureArrivee}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message || 'Impossible de joindre le serveur');
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
      <AddressPicker titre="Départ" valeur={depart} onChoisir={setDepart} />
      <AddressPicker titre="Destination" valeur={destination} onChoisir={setDestination} />

      <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Heure de départ</Text>
      <TextInput
        style={styles.input}
        value={heure}
        onChangeText={setHeure}
        placeholder="07:45"
        keyboardType="numbers-and-punctuation"
        maxLength={5}
      />

      <View style={{ flexDirection: 'row' }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Places</Text>
          <TextInput style={styles.input} value={places} onChangeText={setPlaces} keyboardType="number-pad" placeholder="3" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Prix par passager (DT)</Text>
          <TextInput style={styles.input} value={prix} onChangeText={setPrix} keyboardType="decimal-pad" placeholder="5" />
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontWeight: 'bold' }}>Trajet régulier (chaque semaine)</Text>
        <Switch value={recurrent} onValueChange={setRecurrent} />
      </View>

      {recurrent ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 }}>
          {JOURS.map((j) => {
            const actif = jours.includes(j.cle);
            return (
              <TouchableOpacity
                key={j.cle}
                onPress={() => basculerJour(j.cle)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  marginRight: 8,
                  marginBottom: 8,
                  borderRadius: 20,
                  backgroundColor: actif ? '#2563eb' : '#e5e7eb',
                }}
              >
                <Text style={{ color: actif ? '#fff' : '#111' }}>{j.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <>
          <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Date du trajet</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="2026-11-10"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
        </>
      )}

      <TouchableOpacity style={styles.bouton} onPress={publier} disabled={envoi}>
        {envoi ? <ActivityIndicator color="#fff" /> : <Text style={styles.boutonTexte}>Publier le trajet</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}