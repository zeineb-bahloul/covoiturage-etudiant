import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import api from '../api';
import TimeInput from '../components/TimeInput';
import { Button, Card, Header, Ionicons, Loader, Notice, Row, Screen, SectionTitle } from '../components/ui';
import { colors, font, radius, spacing } from '../theme';
import { HEURE, JOURS, erreurApi } from '../utils';

const etatVide = () => Object.fromEntries(JOURS.map((j) => [j.cle, { actif: false, debut: '', fin: '' }]));

function depuisServeur(jours) {
  const etat = etatVide();
  (jours || []).forEach((j) => {
    etat[j.jour] = { actif: true, debut: j.debut, fin: j.fin };
  });
  return etat;
}

/** Emploi du temps : import ICS/CSV ou saisie manuelle (US5). */
export default function ScheduleScreen({ navigation }) {
  const [lignes, setLignes] = useState(etatVide());
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [importEnCours, setImportEnCours] = useState(false);
  const [info, setInfo] = useState('');

  useEffect(() => {
    api
      .get('/schedule/me')
      .then(({ data }) => setLignes(depuisServeur(data.jours)))
      .catch((err) => Alert.alert('Erreur', erreurApi(err)))
      .finally(() => setChargement(false));
  }, []);

  const modifier = (cle, champ, valeur) => setLignes((avant) => ({ ...avant, [cle]: { ...avant[cle], [champ]: valeur } }));

  const basculer = (cle) =>
    setLignes((avant) => {
      const l = avant[cle];
      return { ...avant, [cle]: { actif: !l.actif, debut: l.debut || '08:30', fin: l.fin || '16:00' } };
    });

  const importer = async () => {
    try {
      const choix = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (choix.canceled) return;
      const fichier = choix.assets[0];
      if (!/\.(ics|csv|txt)$/i.test(fichier.name)) {
        Alert.alert('Format non reconnu', 'Choisissez un fichier .ics (agenda) ou .csv (jour;début;fin).');
        return;
      }
      setImportEnCours(true);
      const contenu = await (await fetch(fichier.uri)).text();
      const { data } = await api.post('/schedule/import', { contenu });
      setLignes(depuisServeur(data.jours));
      setInfo(
        `${data.jours.length} jour(s) importé(s) depuis le fichier ${data.format.toUpperCase()}` +
          (data.ignorees ? ` (${data.ignorees} ligne(s) ignorée(s))` : '') +
          '. Vérifiez puis enregistrez.'
      );
    } catch (err) {
      Alert.alert('Import impossible', erreurApi(err, 'Lecture du fichier impossible'));
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
        Alert.alert('Heure invalide', `${j.label} : écrivez les heures au format HH:MM (ex : 08:30).`);
        return;
      }
      if (l.debut >= l.fin) {
        Alert.alert('Heures incohérentes', `${j.label} : la fin des cours doit être après le début.`);
        return;
      }
      jours.push({ jour: j.cle, debut: l.debut, fin: l.fin });
    }
    setEnvoi(true);
    try {
      await api.put('/schedule/me', { jours });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Enregistrement impossible', erreurApi(err));
    } finally {
      setEnvoi(false);
    }
  };

  if (chargement) return <Loader />;

  return (
    <Screen
      header={<Header title="Mon emploi du temps" subtitle="Sert à comparer les horaires (35 % du score)" onBack={() => navigation.goBack()} />}
      footer={<Button title="Enregistrer" icon="checkmark" onPress={enregistrer} loading={envoi} />}
      keyboard
    >
      <Pressable onPress={importer} disabled={importEnCours} style={styles.import}>
        <View style={styles.importIcone}>
          <Ionicons name={importEnCours ? 'hourglass-outline' : 'cloud-upload-outline'} size={24} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={font.h3}>{importEnCours ? 'Lecture du fichier…' : 'Importer un fichier'}</Text>
          <Text style={font.small}>Agenda .ics ou tableau .csv — les heures d'arrivée et de départ sont extraites automatiquement.</Text>
        </View>
      </Pressable>

      {info ? <Notice tone="success" icon="checkmark-circle-outline" text={info} /> : null}

      <SectionTitle>Ou saisissez vos horaires</SectionTitle>
      <Card padded={false}>
        {JOURS.map((j, i) => {
          const l = lignes[j.cle];
          return (
            <View key={j.cle} style={[styles.jour, i > 0 && styles.jourBordure]}>
              <Pressable onPress={() => basculer(j.cle)} style={styles.jourNom} hitSlop={6}>
                <View style={[styles.case, l.actif && styles.caseActive]}>{l.actif ? <Ionicons name="checkmark" size={15} color={colors.white} /> : null}</View>
                <Text style={[font.label, { fontSize: 15 }, !l.actif && { color: colors.muted }]}>{j.label}</Text>
              </Pressable>
              {l.actif ? (
                <Row gap={6}>
                  <TimeInput value={l.debut} onChange={(v) => modifier(j.cle, 'debut', v)} placeholder="08:30" />
                  <Text style={font.caption}>→</Text>
                  <TimeInput value={l.fin} onChange={(v) => modifier(j.cle, 'fin', v)} placeholder="16:00" />
                </Row>
              ) : (
                <Text style={font.caption}>Pas de cours</Text>
              )}
            </View>
          );
        })}
      </Card>
      <Text style={[font.caption, { textAlign: 'center' }]}>Début du premier cours → fin du dernier cours</Text>

      <Notice
        style={{ marginTop: spacing.lg }}
        tone="info"
        title="Format CSV accepté"
        text={'Une ligne par cours : jour;début;fin\nEx : lundi;08:30;10:00'}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  import: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    marginBottom: spacing.md,
  },
  importIcone: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  jour: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, minHeight: 58 },
  jourBordure: { borderTopWidth: 1, borderTopColor: colors.borderSoft },
  jourNom: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  case: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  caseActive: { backgroundColor: colors.primary, borderColor: colors.primary },
});
