import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, TextInput, Switch, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import api from '../api';
import styles from '../styles';

const JOURS = [
  { cle: 'lundi', label: 'Lundi' },
  { cle: 'mardi', label: 'Mardi' },
  { cle: 'mercredi', label: 'Mercredi' },
  { cle: 'jeudi', label: 'Jeudi' },
  { cle: 'vendredi', label: 'Vendredi' },
  { cle: 'samedi', label: 'Samedi' },
];

const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;

const etatVide = () =>
  Object.fromEntries(JOURS.map((j) => [j.cle, { actif: false, debut: '', fin: '' }]));

export default function ScheduleScreen({ navigation }) {
  const [lignes, setLignes] = useState(etatVide());
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [importEnCours, setImportEnCours] = useState(false);

  useEffect(() => {
    api
      .get('/schedule/me')
      .then(({ data }) => {
        const etat = etatVide();
        data.jours.forEach((j) => {
          etat[j.jour] = { actif: true, debut: j.debut, fin: j.fin };
        });
        setLignes(etat);
      })
      .catch(() => Alert.alert('Erreur', "Impossible de charger l'emploi du temps"))
      .finally(() => setChargement(false));
  }, []);

  const modifier = (cle, champ, valeur) => {
    setLignes((avant) => ({ ...avant, [cle]: { ...avant[cle], [champ]: valeur } }));
  };

  const importerFichier = async () => {
    try {
      const choix = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (choix.canceled) return;

      const fichier = choix.assets[0];
      if (!/\.(ics|csv|txt)$/i.test(fichier.name)) {
        Alert.alert('Format non reconnu', 'Choisissez un fichier .ics ou .csv');
        return;
      }

      setImportEnCours(true);
      const reponse = await fetch(fichier.uri);
      const contenu = await reponse.text();

      const { data } = await api.post('/schedule/import', { contenu });

      const etat = etatVide();
      data.jours.forEach((j) => {
        etat[j.jour] = { actif: true, debut: j.debut, fin: j.fin };
      });
      setLignes(etat);

      Alert.alert(
        'Import réussi',
        `${data.jours.length} jour(s) détecté(s)` +
          (data.ignorees ? `, ${data.ignorees} ligne(s) ignorée(s)` : '') +
          '. Vérifiez les heures puis touchez Enregistrer.'
      );
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message || 'Lecture du fichier impossible');
    } finally {
      setImportEnCours(false);
    }
  };

  const enregistrer = async () => {
    const jours = [];
    for (const j of JOURS) {
      const l = lignes[j.cle];
      if (!l.actif) continue;
      if (!HEURE.test(l.debut) || !HEURE.test(l.fin)) {
        Alert.alert('Attention', `${j.label} : écrivez les heures au format HH:MM (ex : 08:30)`);
        return;
      }
      if (l.debut >= l.fin) {
        Alert.alert('Attention', `${j.label} : la fin doit être après le début`);
        return;
      }
      jours.push({ jour: j.cle, debut: l.debut, fin: l.fin });
    }

    setEnvoi(true);
    try {
      await api.put('/schedule/me', { jours });
      Alert.alert('Succès', 'Emploi du temps enregistré', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
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
      <Text style={{ textAlign: 'center', marginBottom: 20 }}>
        Pour chaque jour de cours, indiquez l'heure de votre premier cours (arrivée) et la fin de votre dernier
        cours (départ).
      </Text>

      <TouchableOpacity
        style={[styles.bouton, { backgroundColor: '#0f766e', marginBottom: 6 }]}
        onPress={importerFichier}
        disabled={importEnCours}
      >
        {importEnCours ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.boutonTexte}>Importer un fichier (.ics ou .csv)</Text>
        )}
      </TouchableOpacity>
      <Text style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', marginBottom: 20 }}>
        CSV : une ligne par cours, au format jour;debut;fin (ex : lundi;08:30;10:00). ICS : export de votre calendrier.
      </Text>

      {JOURS.map((j) => {
        const l = lignes[j.cle];
        return (
          <View key={j.cle} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontWeight: 'bold' }}>{j.label}</Text>
              <Switch value={l.actif} onValueChange={(v) => modifier(j.cle, 'actif', v)} />
            </View>

            {l.actif ? (
              <View style={{ flexDirection: 'row', marginTop: 8 }}>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 8, marginBottom: 0 }]}
                  value={l.debut}
                  onChangeText={(v) => modifier(j.cle, 'debut', v)}
                  placeholder="Arrivée 08:30"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  value={l.fin}
                  onChangeText={(v) => modifier(j.cle, 'fin', v)}
                  placeholder="Départ 16:00"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>
            ) : null}
          </View>
        );
      })}

      <TouchableOpacity style={styles.bouton} onPress={enregistrer} disabled={envoi}>
        {envoi ? <ActivityIndicator color="#fff" /> : <Text style={styles.boutonTexte}>Enregistrer</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}
