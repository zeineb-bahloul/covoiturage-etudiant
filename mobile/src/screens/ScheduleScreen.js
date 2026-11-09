import React, { useEffect, useState } from 'react';
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
import * as DocumentPicker from 'expo-document-picker';
import api from '../api';
import { colors, shadows } from '../theme';
import UniHeader from '../components/UniHeader';

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
        'Importation réussie ! 🎉',
        `${data.jours.length} jour(s) détecté(s). Vérifiez vos heures puis appuyez sur Enregistrer.`
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
        Alert.alert('Format invalide', `${j.label} : écrivez les heures au format HH:MM (ex : 08:30)`);
        return;
      }
      if (l.debut >= l.fin) {
        Alert.alert('Heure incorrecte', `${j.label} : l'heure de départ doit être après l'heure d'arrivée`);
        return;
      }
      jours.push({ jour: j.cle, debut: l.debut, fin: l.fin });
    }

    setEnvoi(true);
    try {
      await api.put('/schedule/me', { jours });
      Alert.alert('Succès !', 'Emploi du temps enregistré pour le calcul automatique des trajets.', [
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <UniHeader
        title="Mon Emploi du Temps"
        subtitle="Matching Intelligent (ISET Nabeul)"
        navigation={navigation}
        showBack={true}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Banner import */}
        <View style={styles.importCard}>
          <Text style={styles.importIcon}>🗓️</Text>
          <Text style={styles.importTitre}>Synchronisez votre planning</Text>
          <Text style={styles.importDesc}>
            Importez votre fichier .ICS ou .CSV fourni par l'institut pour matcher directement avec les conducteurs
            ayant les mêmes horaires de cours.
          </Text>

          <TouchableOpacity
            style={styles.boutonImport}
            onPress={importerFichier}
            disabled={importEnCours}
            activeOpacity={0.85}
          >
            {importEnCours ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.boutonImportTexte}>Importer un fichier (.ics / .csv)</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Jours de cours */}
        <Text style={styles.sectionTitre}>Horaires de cours par jour</Text>

        {JOURS.map((j) => {
          const l = lignes[j.cle];
          return (
            <View key={j.cle} style={[styles.jourCard, l.actif && styles.jourCardActif]}>
              <View style={styles.jourHeader}>
                <View style={styles.jourInfo}>
                  <View style={[styles.jourBullet, l.actif && styles.jourBulletActif]} />
                  <Text style={[styles.jourLabel, l.actif && styles.jourLabelActif]}>{j.label}</Text>
                </View>
                <Switch
                  value={l.actif}
                  onValueChange={(v) => modifier(j.cle, 'actif', v)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                />
              </View>

              {l.actif && (
                <View style={styles.heuresRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.heureLabel}>Premier cours (Arrivée)</Text>
                    <TextInput
                      style={styles.inputHeure}
                      value={l.debut}
                      onChangeText={(v) => modifier(j.cle, 'debut', v)}
                      placeholder="08:30"
                      placeholderTextColor={colors.textLight}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.heureLabel}>Dernier cours (Départ)</Text>
                    <TextInput
                      style={styles.inputHeure}
                      value={l.fin}
                      onChangeText={(v) => modifier(j.cle, 'fin', v)}
                      placeholder="16:00"
                      placeholderTextColor={colors.textLight}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                  </View>
                </View>
              )}
            </View>
          );
        })}

        <TouchableOpacity
          style={styles.boutonEnregistrer}
          onPress={enregistrer}
          disabled={envoi}
          activeOpacity={0.85}
        >
          {envoi ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.boutonEnregistrerTexte}>Enregistrer mon emploi du temps</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  importCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    ...shadows.card,
  },
  importIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  importTitre: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  importDesc: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 16,
  },
  boutonImport: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 20,
    ...shadows.card,
  },
  boutonImportTexte: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  sectionTitre: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  jourCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  jourCardActif: {
    borderColor: '#BBF7D0',
    backgroundColor: colors.card,
    ...shadows.card,
  },
  jourHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jourInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jourBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    marginRight: 10,
  },
  jourBulletActif: {
    backgroundColor: colors.primary,
  },
  jourLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMuted,
  },
  jourLabelActif: {
    color: colors.text,
  },
  heuresRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  heureLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 6,
  },
  inputHeure: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  boutonEnregistrer: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    ...shadows.card,
  },
  boutonEnregistrerTexte: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3,
  },
});
