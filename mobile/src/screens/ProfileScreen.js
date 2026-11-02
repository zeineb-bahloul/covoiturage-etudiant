import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, TextInput, Switch, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import api from '../api';
import styles from '../styles';

const CHOIX_MUSIQUE = [
  { valeur: 'calme', label: 'Calme' },
  { valeur: 'animee', label: 'Animée' },
  { valeur: 'aucune', label: 'Peu importe' },
];

export default function ProfileScreen() {
  const [nom, setNom] = useState('');
  const [filiere, setFiliere] = useState('');
  const [adresse, setAdresse] = useState('');
  const [nonFumeur, setNonFumeur] = useState(true);
  const [mixte, setMixte] = useState(true);
  const [musique, setMusique] = useState('aucune');
  const [note, setNote] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    api
      .get('/auth/me')
      .then(({ data }) => {
        setNom(data.nom);
        setFiliere(data.filiere || '');
        setAdresse(data.adresse || '');
        setNonFumeur(data.preferences?.nonFumeur ?? true);
        setMixte(data.preferences?.mixte ?? true);
        setMusique(data.preferences?.musique || 'aucune');
        setNote(data.noteMoyenne || 0);
      })
      .catch(() => Alert.alert('Erreur', 'Impossible de charger le profil'))
      .finally(() => setChargement(false));
  }, []);

  const sauvegarder = async () => {
    if (!nom.trim()) {
      Alert.alert('Attention', 'Le nom ne peut pas être vide');
      return;
    }
    setEnvoi(true);
    try {
      await api.put('/users/me', {
        nom,
        filiere,
        adresse,
        preferences: { nonFumeur, mixte, musique },
      });
      Alert.alert('Succès', 'Profil mis à jour');
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message || 'Impossible de joindre le serveur');
    } finally {
      setEnvoi(false);
    }
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
      <Text style={{ textAlign: 'center', marginBottom: 20 }}>Note moyenne : {note.toFixed(1)} / 5</Text>

      <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Nom</Text>
      <TextInput style={styles.input} value={nom} onChangeText={setNom} />

      <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Filière</Text>
      <TextInput style={styles.input} value={filiere} onChangeText={setFiliere} />

      <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Adresse approximative (quartier, ville)</Text>
      <TextInput style={styles.input} value={adresse} onChangeText={setAdresse} />

      <Text style={{ fontWeight: 'bold', marginVertical: 8 }}>Préférences de trajet</Text>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text>Non-fumeur</Text>
        <Switch value={nonFumeur} onValueChange={setNonFumeur} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text>Trajet mixte accepté</Text>
        <Switch value={mixte} onValueChange={setMixte} />
      </View>

      <Text style={{ marginBottom: 8 }}>Musique</Text>
      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        {CHOIX_MUSIQUE.map((choix) => {
          const actif = musique === choix.valeur;
          return (
            <TouchableOpacity
              key={choix.valeur}
              onPress={() => setMusique(choix.valeur)}
              style={{
                flex: 1,
                padding: 10,
                marginRight: 6,
                borderRadius: 8,
                alignItems: 'center',
                backgroundColor: actif ? '#2563eb' : '#e5e7eb',
              }}
            >
              <Text style={{ color: actif ? '#fff' : '#111' }}>{choix.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.bouton} onPress={sauvegarder} disabled={envoi}>
        {envoi ? <ActivityIndicator color="#fff" /> : <Text style={styles.boutonTexte}>Enregistrer</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}