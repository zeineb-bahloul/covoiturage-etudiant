import React, { useEffect, useState, useCallback } from 'react';
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
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import api from '../api';
import { colors, shadows, radius } from '../theme';
import UniHeader from '../components/UniHeader';

const JOURS = [
  { cle: 'lundi', code: 'LUN', num: '01', label: 'Lundi' },
  { cle: 'mardi', code: 'MAR', num: '02', label: 'Mardi' },
  { cle: 'mercredi', code: 'MER', num: '03', label: 'Mercredi' },
  { cle: 'jeudi', code: 'JEU', num: '04', label: 'Jeudi' },
  { cle: 'vendredi', code: 'VEN', num: '05', label: 'Vendredi' },
  { cle: 'samedi', code: 'SAM', num: '06', label: 'Samedi' },
];

const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;

const etatVide = () =>
  Object.fromEntries(JOURS.map((j) => [j.cle, { actif: false, debut: '', fin: '' }]));

export default function ScheduleScreen({ navigation }) {
  const [lignes, setLignes] = useState(etatVide());
  const [jourSelectionne, setJourSelectionne] = useState('lundi');
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

  const modifier = useCallback((cle, champ, valeur) => {
    setLignes((avant) => ({ ...avant, [cle]: { ...avant[cle], [champ]: valeur } }));
  }, []);

  const importerFichier = useCallback(async () => {
    try {
      const choix = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (choix.canceled) return;

      const fichier = choix.assets[0];
      if (!/\.(ics|csv|txt)$/i.test(fichier.name)) {
        Alert.alert('Format non reconnu', 'Veuillez choisir un fichier .ics ou .csv');
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
        'Importation réussie !',
        `${data.jours.length} jour(s) synchronisé(s). Vérifiez vos heures puis appuyez sur Enregistrer.`
      );
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message || 'Lecture du fichier impossible');
    } finally {
      setImportEnCours(false);
    }
  }, []);

  const enregistrer = useCallback(async () => {
    const jours = [];
    for (const j of JOURS) {
      const l = lignes[j.cle];
      if (!l.actif) continue;
      if (!HEURE.test(l.debut) || !HEURE.test(l.fin)) {
        Alert.alert('Format invalide', `${j.label} : écrivez les heures au format HH:MM (ex : 08:30)`);
        return;
      }
      if (l.debut >= l.fin) {
        Alert.alert('Heure incorrecte', `${j.label} : l'heure de départ doit être après l'heure d'arrivée`);
        return;
      }
      jours.push({ jour: j.cle, debut: l.debut, fin: j.fin });
    }

    setEnvoi(true);
    try {
      await api.put('/schedule/me', { jours });
      Alert.alert('Succès !', 'Emploi du temps enregistré pour le matching intelligent avec vos camarades.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message || 'Impossible de joindre le serveur');
    } finally {
      setEnvoi(false);
    }
  }, [lignes, navigation]);

  if (chargement) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const ligneCourante = lignes[jourSelectionne] || { actif: false, debut: '', fin: '' };
  const jourObj = JOURS.find((j) => j.cle === jourSelectionne) || JOURS[0];

  return (
    <View style={s.container}>
      <UniHeader
        title="Mon Planning"
        subtitle="Emploi du temps ISET Nabeul"
        navigation={navigation}
        showBack={true}
      />

      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        {/* ─── Sélecteur horizontal de jours (Page 5 PDF) ─── */}
        <Text style={s.sectionTitle}>Semaine Universitaire</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.daysRow}
        >
          {JOURS.map((j) => {
            const isSelected = jourSelectionne === j.cle;
            const hasClass = lignes[j.cle]?.actif;
            return (
              <TouchableOpacity
                key={j.cle}
                style={[s.dayChip, isSelected && s.dayChipActive]}
                onPress={() => setJourSelectionne(j.cle)}
                activeOpacity={0.8}
              >
                <Text style={[s.dayCode, isSelected && s.dayCodeActive]}>{j.code}</Text>
                <View style={[s.dayCircle, isSelected && s.dayCircleActive]}>
                  <Text style={[s.dayNum, isSelected && s.dayNumActive]}>{j.num}</Text>
                </View>
                {hasClass && <View style={[s.dotIndicator, isSelected && s.dotIndicatorActive]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ─── Carte détaillée du jour sélectionné ─── */}
        <View style={s.detailCard}>
          <View style={s.detailCardHeader}>
            <View>
              <Text style={s.detailDayName}>{jourObj.label}</Text>
              <Text style={s.detailDayStatus}>
                {ligneCourante.actif ? 'Journée de cours programmée' : 'Pas de cours ce jour'}
              </Text>
            </View>
            <Switch
              value={ligneCourante.actif}
              onValueChange={(val) => modifier(jourSelectionne, 'actif', val)}
              trackColor={{ false: '#E2E8F0', true: colors.primary }}
              thumbColor={ligneCourante.actif ? colors.accent : '#FFF'}
            />
          </View>

          {ligneCourante.actif ? (
            <View style={s.hoursBlock}>
              <View style={s.timelineItem}>
                <View style={s.timelineBadgeBlue}>
                  <Text style={s.timelineBadgeText}>Arrivée</Text>
                </View>
                <View style={s.timelineContent}>
                  <Text style={s.inputLabel}>Premier cours à l'ISET</Text>
                  <TextInput
                    style={s.hourInput}
                    value={ligneCourante.debut}
                    onChangeText={(val) => modifier(jourSelectionne, 'debut', val)}
                    placeholder="08:30"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                </View>
              </View>

              <View style={s.timelineItem}>
                <View style={s.timelineBadgeYellow}>
                  <Text style={s.timelineBadgeTextYellow}>Départ</Text>
                </View>
                <View style={s.timelineContent}>
                  <Text style={s.inputLabel}>Dernier cours (Départ)</Text>
                  <TextInput
                    style={s.hourInput}
                    value={ligneCourante.fin}
                    onChangeText={(val) => modifier(jourSelectionne, 'fin', val)}
                    placeholder="16:00"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                </View>
              </View>

              <View style={s.infoTip}>
                <Text style={s.infoTipIcon}>ℹ️</Text>
                <Text style={s.infoTipText}>
                  Vos trajets proposés ou recherchés seront automatiquement synchronisés avec ces heures pour maximiser votre score de matching.
                </Text>
              </View>
            </View>
          ) : (
            <View style={s.emptyDayBox}>
              <Text style={s.emptyDayIcon}>🏖️</Text>
              <Text style={s.emptyDayText}>Aucun cours programmé pour ce jour.</Text>
              <TouchableOpacity
                style={s.activateDayBtn}
                onPress={() => modifier(jourSelectionne, 'actif', true)}
              >
                <Text style={s.activateDayBtnText}>+ Ajouter des heures de cours</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ─── Synchronisation Intelligente (Page 7 PDF) ─── */}
        <View style={s.syncCard}>
          <View style={s.dashedBox}>
            <View style={s.syncIconContainer}>
              <Text style={s.syncIcon}>📅</Text>
            </View>
            <Text style={s.syncTitle}>Synchronisation Intelligente</Text>
            <Text style={s.syncSubtitle}>
              Importez votre emploi du temps (.ics ou .csv) pour configurer automatiquement toute votre semaine en 1 clic.
            </Text>

            <TouchableOpacity
              style={s.browseBtn}
              onPress={importerFichier}
              disabled={importEnCours}
              activeOpacity={0.85}
            >
              {importEnCours ? (
                <ActivityIndicator color={colors.navy} />
              ) : (
                <Text style={s.browseBtnText}>Choisir un fichier (.ics / .csv)</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Bouton Sauvegarder (Bleu Royal) ─── */}
        <TouchableOpacity
          style={s.saveButton}
          onPress={enregistrer}
          disabled={envoi}
          activeOpacity={0.85}
        >
          {envoi ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={s.saveButtonText}>Enregistrer mon planning</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  daysRow: {
    paddingBottom: 16,
    gap: 10,
  },
  dayChip: {
    width: 60,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...shadows.card,
  },
  dayChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    transform: [{ scale: 1.05 }],
  },
  dayCode: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
  },
  dayCodeActive: {
    color: '#FFFFFF',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: {
    backgroundColor: colors.accent,
  },
  dayNum: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  dayNumActive: {
    color: colors.navy,
  },
  dotIndicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  dotIndicatorActive: {
    backgroundColor: colors.accent,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.card,
  },
  detailCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailDayName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  detailDayStatus: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  hoursBlock: {
    marginTop: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  timelineBadgeBlue: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    marginRight: 12,
    width: 70,
    alignItems: 'center',
  },
  timelineBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  timelineBadgeYellow: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FEF9C3',
    marginRight: 12,
    width: 70,
    alignItems: 'center',
  },
  timelineBadgeTextYellow: {
    color: '#854D0E',
    fontSize: 11,
    fontWeight: '800',
  },
  timelineContent: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  hourInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  infoTip: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    alignItems: 'center',
  },
  infoTipIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  infoTipText: {
    fontSize: 12,
    color: '#0369A1',
    flex: 1,
    lineHeight: 16,
  },
  emptyDayBox: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyDayIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyDayText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  activateDayBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
  },
  activateDayBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  syncCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.card,
  },
  dashedBox: {
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  syncIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  syncIcon: {
    fontSize: 24,
  },
  syncTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  syncSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
    paddingHorizontal: 10,
  },
  browseBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 24,
    ...shadows.card,
  },
  browseBtnText: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '800',
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    ...shadows.elevated,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
