import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import api from '../api';
import { colors, shadows } from '../theme';
import AddressPicker from '../components/AddressPicker';
import UniHeader from '../components/UniHeader';

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
  const [places, setPlaces] = useState('3');
  const [prix, setPrix] = useState('2.5');
  const [recurrent, setRecurrent] = useState(true);
  const [jours, setJours] = useState(['lundi', 'mardi', 'mercredi', 'jeudi']);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [envoi, setEnvoi] = useState(false);

  const basculerJour = (cle) => {
    setJours((avant) => (avant.includes(cle) ? avant.filter((j) => j !== cle) : [...avant, cle]));
  };

  const publier = async () => {
    if (!depart || !destination) {
      Alert.alert('Champs requis', 'Veuillez sélectionner le départ et la destination');
      return;
    }
    if (!HEURE.test(heure)) {
      Alert.alert('Heure invalide', 'Indiquez une heure de départ au format HH:MM (ex : 07:45)');
      return;
    }
    if (!places || prix === '') {
      Alert.alert('Places & Prix requis', 'Indiquez le nombre de places et le prix par passager');
      return;
    }
    if (recurrent && jours.length === 0) {
      Alert.alert('Jour requis', 'Choisissez au moins un jour de la semaine pour ce trajet régulier');
      return;
    }
    if (!recurrent && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert('Date invalide', 'Indiquez la date au format AAAA-MM-JJ');
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
        'Trajet publié avec succès ! 🚗',
        `Distance : ${data.distanceKm} km, durée environ ${data.dureeMin} min.\nArrivée prévue à ${data.heureArrivee}. Vos camarades peuvent maintenant réserver !`,
        [{ text: 'Voir mes trajets', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message || 'Impossible de joindre le serveur');
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <View style={styles.container}>
      <UniHeader
        title="Publier un trajet"
        subtitle="Proposer des places libres"
        navigation={navigation}
        showBack={true}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <AddressPicker
            titre="Point de départ"
            valeur={depart}
            onChoisir={setDepart}
            placeholder="Ex : Ariana, Hammamet, Nabeul..."
          />

          <AddressPicker
            titre="Destination"
            valeur={destination}
            onChoisir={setDestination}
            placeholder="Ex : ISET Nabeul"
          />

          <Text style={styles.label}>Heure de départ</Text>
          <TextInput
            style={styles.input}
            value={heure}
            onChangeText={setHeure}
            placeholder="07:45"
            placeholderTextColor={colors.textLight}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />

          <View style={styles.rowChamps}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Places libres</Text>
              <TextInput
                style={styles.input}
                value={places}
                onChangeText={setPlaces}
                keyboardType="number-pad"
                placeholder="3"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Prix / passager (DT)</Text>
              <TextInput
                style={styles.input}
                value={prix}
                onChangeText={setPrix}
                keyboardType="decimal-pad"
                placeholder="2.5"
              />
            </View>
          </View>

          <View style={styles.recurrentRow}>
            <View>
              <Text style={styles.recurrentTitle}>Trajet récurrent</Text>
              <Text style={styles.recurrentSub}>Répété chaque semaine selon vos cours</Text>
            </View>
            <Switch
              value={recurrent}
              onValueChange={setRecurrent}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          {recurrent ? (
            <View style={styles.joursSection}>
              <Text style={[styles.label, { marginBottom: 8 }]}>Jours du trajet :</Text>
              <View style={styles.joursGrid}>
                {JOURS.map((j) => {
                  const actif = jours.includes(j.cle);
                  return (
                    <TouchableOpacity
                      key={j.cle}
                      onPress={() => basculerJour(j.cle)}
                      style={[styles.jourChip, actif && styles.jourChipActif]}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.jourChipTexte, actif && styles.jourChipTexteActif]}>
                        {j.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Date du trajet ponctuel</Text>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="AAAA-MM-JJ"
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </View>
          )}

          <TouchableOpacity
            style={styles.boutonPublier}
            onPress={publier}
            disabled={envoi}
            activeOpacity={0.85}
          >
            {envoi ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.boutonPublierTexte}>Publier mon trajet</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    marginBottom: 16,
  },
  rowChamps: {
    flexDirection: 'row',
  },
  recurrentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: 4,
  },
  recurrentTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  recurrentSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  joursSection: {
    marginTop: 8,
  },
  joursGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  jourChip: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  jourChipActif: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  jourChipTexte: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  jourChipTexteActif: {
    color: colors.white,
  },
  boutonPublier: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    ...shadows.card,
  },
  boutonPublierTexte: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3,
  },
});
