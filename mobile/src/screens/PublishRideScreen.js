import React, { useState, useCallback } from 'react';
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
import { colors, shadows, radius } from '../theme';
import AddressPicker from '../components/AddressPicker';
import UniHeader from '../components/UniHeader';

const JOURS = [
  { cle: 'lundi', label: 'L' },
  { cle: 'mardi', label: 'M' },
  { cle: 'mercredi', label: 'M' },
  { cle: 'jeudi', label: 'J' },
  { cle: 'vendredi', label: 'V' },
  { cle: 'samedi', label: 'S' },
];

const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function PublishRideScreen({ navigation }) {
  const [depart, setDepart] = useState(null);
  const [destination, setDestination] = useState(null);
  const [heure, setHeure] = useState('07:45');
  const [places, setPlaces] = useState(3);
  const [prix, setPrix] = useState('2.5');
  const [recurrent, setRecurrent] = useState(true);
  const [jours, setJours] = useState(['lundi', 'mardi', 'mercredi', 'jeudi']);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [envoi, setEnvoi] = useState(false);

  const basculerJour = useCallback((cle) => {
    setJours((avant) => (avant.includes(cle) ? avant.filter((j) => j !== cle) : [...avant, cle]));
  }, []);

  const modifierPlaces = useCallback((delta) => {
    setPlaces((prev) => Math.min(6, Math.max(1, prev + delta)));
  }, []);

  const publier = useCallback(async () => {
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
        prix: Number(String(prix).replace(',', '.')),
        recurrent,
        jours: recurrent ? jours : [],
        date: recurrent ? undefined : date,
      });

      Alert.alert(
        'Trajet publié avec succès !',
        `Distance : ${data.distanceKm} km, durée ~${data.dureeMin} min.\nArrivée prévue à ${data.heureArrivee}. Vos camarades peuvent maintenant réserver !`,
        [{ text: 'Voir mes trajets', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message || 'Impossible de joindre le serveur');
    } finally {
      setEnvoi(false);
    }
  }, [depart, destination, heure, places, prix, recurrent, jours, date, navigation]);

  return (
    <View style={s.container}>
      <UniHeader
        title="Proposer un trajet"
        subtitle="Partagez vos trajets vers l'ISET"
        navigation={navigation}
        showBack={true}
      />

      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        {/* ─── Carte Itinéraire (Page 9 PDF) ─── */}
        <View style={s.card}>
          <Text style={s.cardSectionTitle}>ITINÉRAIRE</Text>

          <AddressPicker
            titre="Point de départ"
            valeur={depart}
            onChoisir={setDepart}
            placeholder="Ex : Gare Nabeul, Hammamet..."
          />

          <View style={s.routeDivider}>
            <View style={s.routeDotBlue} />
            <View style={s.routeLine} />
            <View style={s.routeDotYellow} />
          </View>

          <AddressPicker
            titre="Destination"
            valeur={destination}
            onChoisir={setDestination}
            placeholder="Ex : ISET Nabeul"
          />
        </View>

        {/* ─── Horaire & Fréquence ─── */}
        <View style={s.card}>
          <Text style={s.cardSectionTitle}>HORAIRE & FRÉQUENCE</Text>

          <Text style={s.fieldLabel}>HEURE DE DÉPART</Text>
          <TextInput
            style={s.input}
            value={heure}
            onChangeText={setHeure}
            placeholder="07:45"
            placeholderTextColor="#94A3B8"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />

          <View style={s.recurrentRow}>
            <View>
              <Text style={s.recurrentTitle}>Trajet régulier</Text>
              <Text style={s.recurrentSub}>Répété chaque semaine selon vos cours</Text>
            </View>
            <Switch
              value={recurrent}
              onValueChange={setRecurrent}
              trackColor={{ false: '#E2E8F0', true: colors.primary }}
              thumbColor={recurrent ? colors.accent : '#FFF'}
            />
          </View>

          {recurrent ? (
            <View style={s.joursSection}>
              <Text style={s.fieldLabel}>JOURS DU TRAJET</Text>
              <View style={s.joursRow}>
                {JOURS.map((j) => {
                  const actif = jours.includes(j.cle);
                  return (
                    <TouchableOpacity
                      key={j.cle}
                      onPress={() => basculerJour(j.cle)}
                      style={[s.jourCircle, actif && s.jourCircleActif]}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.jourCircleText, actif && s.jourCircleTextActif]}>
                        {j.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={{ marginTop: 10 }}>
              <Text style={s.fieldLabel}>DATE DU TRAJET</Text>
              <TextInput
                style={s.input}
                value={date}
                onChangeText={setDate}
                placeholder="AAAA-MM-JJ"
                placeholderTextColor="#94A3B8"
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </View>
          )}
        </View>

        {/* ─── Places et Prix ─── */}
        <View style={s.card}>
          <Text style={s.cardSectionTitle}>PLACES & TARIF</Text>

          {/* Stepper places */}
          <View style={s.stepperRow}>
            <View>
              <Text style={s.stepperTitle}>Places disponibles</Text>
              <Text style={s.stepperSub}>Passagers acceptés dans le véhicule</Text>
            </View>

            <View style={s.stepperControls}>
              <TouchableOpacity
                style={s.stepperBtn}
                onPress={() => modifierPlaces(-1)}
                activeOpacity={0.7}
              >
                <Text style={s.stepperBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={s.stepperValue}>{places}</Text>
              <TouchableOpacity
                style={s.stepperBtn}
                onPress={() => modifierPlaces(1)}
                activeOpacity={0.7}
              >
                <Text style={s.stepperBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.divider} />

          {/* Tarif par passager */}
          <View style={s.priceSection}>
            <View style={s.priceHeader}>
              <View>
                <Text style={s.stepperTitle}>Participation aux frais</Text>
                <Text style={s.stepperSub}>Prix conseillé par passager</Text>
              </View>

              <View style={s.priceInputBox}>
                <TextInput
                  style={s.priceInput}
                  value={String(prix)}
                  onChangeText={setPrix}
                  keyboardType="decimal-pad"
                  placeholder="2.5"
                  placeholderTextColor="#94A3B8"
                />
                <Text style={s.priceCurrency}>DT</Text>
              </View>
            </View>

            {/* Suggestions rapides de prix */}
            <View style={s.priceChipsRow}>
              {['1.5', '2.0', '2.5', '3.0'].map((p) => {
                const isSelected = String(prix) === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[s.priceChip, isSelected && s.priceChipSelected]}
                    onPress={() => setPrix(p)}
                  >
                    <Text style={[s.priceChipText, isSelected && s.priceChipTextSelected]}>
                      {p} DT
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* ─── Bouton de publication (Bleu Royal) ─── */}
        <TouchableOpacity
          style={s.publishBtn}
          onPress={publier}
          disabled={envoi}
          activeOpacity={0.85}
        >
          {envoi ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={s.publishBtnText}>Publier mon trajet 🚗</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.card,
  },
  cardSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  routeDivider: {
    alignItems: 'center',
    marginVertical: 4,
  },
  routeDotBlue: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: '#CBD5E1',
    marginVertical: 2,
  },
  routeDotYellow: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  recurrentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  recurrentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  recurrentSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  joursSection: {
    marginTop: 14,
  },
  joursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  jourCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  jourCircleActif: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  jourCircleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  jourCircleTextActif: {
    color: '#FFFFFF',
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepperTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  stepperSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  stepperBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    minWidth: 20,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  priceSection: {},
  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  priceInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  priceInput: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    width: 44,
    textAlign: 'center',
  },
  priceCurrency: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    marginLeft: 4,
  },
  priceChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  priceChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  priceChipSelected: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  priceChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  priceChipTextSelected: {
    color: colors.primary,
    fontWeight: '800',
  },
  publishBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    ...shadows.elevated,
    marginTop: 8,
  },
  publishBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
