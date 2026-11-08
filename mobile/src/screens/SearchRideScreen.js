import React, { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import styles from '../styles';
import AddressPicker from '../components/AddressPicker';

const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function SearchRideScreen({ navigation }) {
  const [lieu, setLieu] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [heure, setHeure] = useState('');
  const [prixMax, setPrixMax] = useState('');

  const rechercher = () => {
    if (!lieu) {
      Alert.alert('Attention', 'Choisissez votre point de départ');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert('Attention', 'Date au format AAAA-MM-JJ (ex : 2026-11-09)');
      return;
    }
    if (heure && !HEURE.test(heure)) {
      Alert.alert('Attention', 'Heure au format HH:MM (ex : 08:00)');
      return;
    }

    navigation.navigate('RideResults', {
      lat: lieu.lat,
      lng: lieu.lng,
      label: lieu.label,
      date,
      heure: heure || undefined,
      prixMax: prixMax ? prixMax.replace(',', '.') : undefined,
    });
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
      <AddressPicker titre="Mon point de départ" valeur={lieu} onChoisir={setLieu} />

      <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Date</Text>
      <TextInput
        style={styles.input}
        value={date}
        onChangeText={setDate}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
      />

      <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Heure souhaitée (facultatif)</Text>
      <TextInput
        style={styles.input}
        value={heure}
        onChangeText={setHeure}
        placeholder="08:00"
        keyboardType="numbers-and-punctuation"
        maxLength={5}
      />

      <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Prix maximum en DT (facultatif)</Text>
      <TextInput
        style={styles.input}
        value={prixMax}
        onChangeText={setPrixMax}
        placeholder="10"
        keyboardType="decimal-pad"
      />

      <TouchableOpacity style={styles.bouton} onPress={rechercher}>
        <Text style={styles.boutonTexte}>Rechercher</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}