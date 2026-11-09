import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { colors, shadows, radius } from '../theme';
import AddressPicker from '../components/AddressPicker';

export default function SearchRideScreen({ navigation }) {
  const [lieu, setLieu] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [heure, setHeure] = useState('08:00');
  const [prixMax, setPrixMax] = useState('');

  const rechercher = useCallback(() => {
    if (!lieu) {
      Alert.alert('Point de départ requis', 'Indiquez votre lieu de départ.');
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
  }, [lieu, date, heure, prixMax, navigation]);

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        {/* ─── Header Bleu Royal UniRide (Page 6) ─── */}
        <View style={s.header}>
          <View style={s.headerTitleRow}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <Text style={s.backArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={s.headerTitle}>Trouver un trajet</Text>
          </View>

          {/* Carte blanche de recherche */}
          <View style={s.searchCard}>
            <AddressPicker
              titre="D'où partez-vous ?"
              valeur={lieu}
              onChoisir={setLieu}
              placeholder="Saisissez votre ville ou quartier..."
            />

            <View style={s.divider} />

            <View style={s.fixedDestRow}>
              <Text style={s.destIcon}>🏛</Text>
              <Text style={s.destText}>ISET Nabeul (Campus El Mahrsi)</Text>
            </View>
          </View>

          {/* Barre de filtre date/heure avec bouton jaune */}
          <View style={s.filterBar}>
            <View style={s.filterItem}>
              <Text style={s.filterIcon}>📅</Text>
              <TextInput
                style={s.filterInput}
                value={date}
                onChangeText={setDate}
                placeholder="AAAA-MM-JJ"
                placeholderTextColor="rgba(255,255,255,0.7)"
              />
            </View>

            <View style={s.filterDivider} />

            <View style={s.filterItem}>
              <Text style={s.filterIcon}>⏰</Text>
              <TextInput
                style={s.filterInput}
                value={heure}
                onChangeText={setHeure}
                placeholder="08:00"
                placeholderTextColor="rgba(255,255,255,0.7)"
              />
            </View>

            {/* Bouton Jaune de filtre / recherche (Page 6) */}
            <TouchableOpacity style={s.yellowFilterBtn} onPress={rechercher} activeOpacity={0.85}>
              <Text style={s.yellowFilterIcon}>🔍</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bouton de recherche principal */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <TouchableOpacity style={s.btnRechercher} onPress={rechercher} activeOpacity={0.85}>
            <Text style={s.btnRechercherText}>Rechercher les covoiturages</Text>
          </TouchableOpacity>
        </View>
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
    paddingBottom: 40,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 36,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  backArrow: {
    fontSize: 30,
    color: colors.white,
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
  },
  searchCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    ...shadows.elevated,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 10,
  },
  fixedDestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  destIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  destText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.md,
    marginTop: 14,
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 4,
  },
  filterItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  filterInput: {
    flex: 1,
    fontSize: 13,
    color: colors.white,
    fontWeight: '600',
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 8,
  },
  yellowFilterBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yellowFilterIcon: {
    fontSize: 18,
    color: colors.text,
    fontWeight: 'bold',
  },
  btnRechercher: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
    ...shadows.elevated,
  },
  btnRechercherText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
});
