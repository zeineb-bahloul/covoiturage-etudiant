import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import api from '../api';
import styles from '../styles';

const COULEURS = [
  { valeur: 'blanc', label: 'Blanc', hex: '#ffffff' },
  { valeur: 'noir', label: 'Noir', hex: '#111827' },
  { valeur: 'gris', label: 'Gris', hex: '#6b7280' },
  { valeur: 'argent', label: 'Argent', hex: '#c0c0c0' },
  { valeur: 'rouge', label: 'Rouge', hex: '#dc2626' },
  { valeur: 'bleu', label: 'Bleu', hex: '#2563eb' },
  { valeur: 'vert', label: 'Vert', hex: '#16a34a' },
  { valeur: 'jaune', label: 'Jaune', hex: '#facc15' },
  { valeur: 'orange', label: 'Orange', hex: '#f97316' },
  { valeur: 'marron', label: 'Marron', hex: '#92400e' },
  { valeur: 'autre', label: 'Autre', hex: '#a78bfa' },
];

export default function VehicleScreen({ navigation }) {
  const [marque, setMarque] = useState('');
  const [couleur, setCouleur] = useState('');
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
          setCouleur(data.vehicule.couleur || '');
          setPlaces(String(data.vehicule.places));
          setMatricule(data.vehicule.matricule);
          setExiste(true);
        }
      })
      .catch(() => Alert.alert('Erreur', 'Impossible de charger le véhicule'))
      .finally(() => setChargement(false));
  }, []);

  const enregistrer = async () => {
    if (!marque.trim() || !couleur || !places || !matricule.trim()) {
      Alert.alert('Attention', 'Remplissez tous les champs, y compris la couleur');
      return;
    }
    setEnvoi(true);
    try {
      await api.put('/users/me/vehicule', { marque, couleur, places: Number(places), matricule });
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

      <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>
        Couleur{couleur ? ` : ${COULEURS.find((c) => c.valeur === couleur)?.label}` : ''}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
        {COULEURS.map((c) => {
          const actif = couleur === c.valeur;
          return (
            <TouchableOpacity
              key={c.valeur}
              onPress={() => setCouleur(c.valeur)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                marginRight: 10,
                marginBottom: 10,
                backgroundColor: c.hex,
                borderWidth: actif ? 4 : 1,
                borderColor: actif ? '#2563eb' : '#9ca3af',
              }}
            />
          );
        })}
      </View>

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
