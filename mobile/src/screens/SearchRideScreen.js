import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  StyleSheet,
} from 'react-native';
import { colors, shadows } from '../theme';
import AddressPicker from '../components/AddressPicker';
import UniHeader from '../components/UniHeader';

const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function SearchRideScreen({ navigation }) {
  const [lieu, setLieu] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [heure, setHeure] = useState('');
  const [prixMax, setPrixMax] = useState('');
  const [noteMin, setNoteMin] = useState(0);
  const [nonFumeur, setNonFumeur] = useState(false);
  const [mixte, setMixte] = useState(false);

  const definirDateRapide = (joursAjoutes) => {
    const d = new Date();
    d.setDate(d.getDate() + joursAjoutes);
    setDate(d.toISOString().slice(0, 10));
  };

  const rechercher = () => {
    if (!lieu) {
      Alert.alert('Point de départ requis', 'Indiquez votre lieu de départ pour lancer la recherche.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert('Date invalide', 'Veuillez saisir la date au format AAAA-MM-JJ (ex : 2026-11-10)');
      return;
    }
    if (heure && !HEURE.test(heure)) {
      Alert.alert('Heure invalide', 'Veuillez saisir une heure au format HH:MM (ex : 08:00)');
      return;
    }

    navigation.navigate('RideResults', {
      lat: lieu.lat,
      lng: lieu.lng,
      label: lieu.label,
      date,
      heure: heure || undefined,
      prixMax: prixMax ? prixMax.replace(',', '.') : undefined,
      noteMin: noteMin > 0 ? noteMin : undefined,
      nonFumeur: nonFumeur ? 'true' : undefined,
      mixte: mixte ? 'true' : undefined,
    });
  };

  return (
    <View style={styles.container}>
      <UniHeader
        title="Rechercher un trajet"
        subtitle="Trouvez votre covoitureur ISET"
        navigation={navigation}
        showBack={true}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Banner éco-campus */}
        <View style={styles.bannerInfo}>
          <Text style={styles.bannerIcon}>🌱</Text>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.bannerTitre}>UniRide Éco-Mobilité</Text>
            <Text style={styles.bannerDesc}>
              Recherchez des trajets directs vers l’ISET Nabeul partagés par vos camarades d’institut.
            </Text>
          </View>
        </View>

        {/* Formulaire de recherche */}
        <View style={styles.card}>
          <AddressPicker
            titre="Mon point de départ"
            valeur={lieu}
            onChoisir={setLieu}
            placeholder="Ex : Hammamet, Nabeul Jarzouna..."
          />

          <View style={styles.champGroupe}>
            <Text style={styles.label}>Destination</Text>
            <View style={styles.destinationFixe}>
              <Text style={styles.destinationTexte}>📍 ISET Nabeul (Campus El Mahrsi)</Text>
            </View>
          </View>

          <View style={styles.champGroupe}>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Date du trajet</Text>
              <View style={styles.dateChipsRow}>
                <TouchableOpacity style={styles.dateChip} onPress={() => definirDateRapide(0)}>
                  <Text style={styles.dateChipText}>Aujourd'hui</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dateChip} onPress={() => definirDateRapide(1)}>
                  <Text style={styles.dateChipText}>Demain</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              keyboardType="numbers-and-punctuation"
              placeholder="AAAA-MM-JJ"
              maxLength={10}
            />
          </View>

          <View style={styles.rowChamps}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Heure souhaitée</Text>
              <TextInput
                style={styles.input}
                value={heure}
                onChangeText={setHeure}
                placeholder="08:00"
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Prix max (DT)</Text>
              <TextInput
                style={styles.input}
                value={prixMax}
                onChangeText={setPrixMax}
                placeholder="Ex : 5"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Filtres avancés (US7) */}
          <Text style={[styles.label, { marginTop: 8, marginBottom: 8 }]}>Note minimale du conducteur</Text>
          <View style={styles.noteRow}>
            {[
              { label: 'Toutes', val: 0 },
              { label: '4.0+ ★', val: 4.0 },
              { label: '4.5+ ★', val: 4.5 },
            ].map((n) => {
              const actif = noteMin === n.val;
              return (
                <TouchableOpacity
                  key={n.label}
                  style={[styles.notePill, actif && styles.notePillActif]}
                  onPress={() => setNoteMin(n.val)}
                >
                  <Text style={[styles.notePillTexte, actif && styles.notePillTexteActif]}>
                    {n.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Véhicule non-fumeur uniquement</Text>
            <Switch
              value={nonFumeur}
              onValueChange={setNonFumeur}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Trajet mixte uniquement</Text>
            <Switch
              value={mixte}
              onValueChange={setMixte}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <TouchableOpacity style={styles.boutonChercher} onPress={rechercher} activeOpacity={0.85}>
            <Text style={styles.boutonChercherTexte}>Rechercher un trajet</Text>
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
  bannerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: 14,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  bannerIcon: {
    fontSize: 24,
  },
  bannerTitre: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  bannerDesc: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  champGroupe: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateChipsRow: {
    flexDirection: 'row',
  },
  dateChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginLeft: 6,
  },
  dateChipText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  destinationFixe: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  destinationTexte: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
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
  },
  rowChamps: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  noteRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  notePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginRight: 6,
  },
  notePillActif: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  notePillTexte: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  notePillTexteActif: {
    color: colors.white,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  switchLabel: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  boutonChercher: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    ...shadows.card,
  },
  boutonChercherTexte: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3,
  },
});
