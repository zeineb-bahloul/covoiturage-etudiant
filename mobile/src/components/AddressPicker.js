import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import api from '../api';
import styles from '../styles';

export default function AddressPicker({ titre, valeur, onChoisir }) {
  const [texte, setTexte] = useState('');
  const [resultats, setResultats] = useState([]);
  const [recherche, setRecherche] = useState(false);
  const [message, setMessage] = useState('');

  const chercher = async () => {
    setMessage('');
    if (texte.trim().length < 3) {
      setMessage('Écrivez au moins 3 caractères');
      return;
    }
    setRecherche(true);
    try {
      const { data } = await api.get('/map/geocode', { params: { text: texte.trim() } });
      setResultats(data);
      if (data.length === 0) setMessage('Aucun lieu trouvé');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Impossible de joindre le serveur');
    } finally {
      setRecherche(false);
    }
  };

  const choisir = (lieu) => {
    onChoisir(lieu);
    setResultats([]);
    setTexte('');
  };

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>{titre}</Text>

      {valeur ? (
        <View style={{ padding: 12, borderRadius: 8, backgroundColor: '#dcfce7' }}>
          <Text>✓ {valeur.label}</Text>
          <Text style={{ color: '#2563eb', marginTop: 6 }} onPress={() => onChoisir(null)}>
            Changer
          </Text>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row' }}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0, marginRight: 8 }]}
              value={texte}
              onChangeText={setTexte}
              placeholder="Ex : Hammamet"
              onSubmitEditing={chercher}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={[styles.bouton, { marginTop: 0, paddingHorizontal: 16 }]}
              onPress={chercher}
              disabled={recherche}
            >
              {recherche ? <ActivityIndicator color="#fff" /> : <Text style={styles.boutonTexte}>OK</Text>}
            </TouchableOpacity>
          </View>

          {message ? <Text style={{ color: '#dc2626', marginTop: 8 }}>{message}</Text> : null}

          {resultats.map((lieu, i) => (
            <TouchableOpacity
              key={`${lieu.lat}-${lieu.lng}-${i}`}
              onPress={() => choisir(lieu)}
              style={{ padding: 12, borderBottomWidth: 1, borderColor: '#e5e7eb' }}
            >
              <Text>{lieu.label}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}
    </View>
  );
}