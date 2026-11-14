import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import api from '../api';
import { Button, Header, Input, Ionicons, Notice, Screen } from '../components/ui';
import { colors, font, radius, spacing } from '../theme';
import { erreurApi } from '../utils';

const MOTIFS = [
  { id: 'comportement_inapproprie', label: 'Comportement inapproprié', description: 'Propos irrespectueux, attitude déplacée', icone: 'hand-left-outline' },
  { id: 'conduite_dangereuse', label: 'Conduite dangereuse', description: 'Excès de vitesse, imprudence', icone: 'warning-outline' },
  { id: 'retard_excessif', label: 'Retard important', description: 'Plus de 20 minutes sans prévenir', icone: 'time-outline' },
  { id: 'annulation_imprevue', label: 'Annulation de dernière minute', description: 'Absent ou annulation sans prévenir', icone: 'close-circle-outline' },
  { id: 'autre', label: 'Autre problème', description: 'Une autre situation anormale', icone: 'ellipsis-horizontal-circle-outline' },
];

/** Signaler un comportement inapproprié (US15). */
export default function ReportScreen({ route, navigation }) {
  const { utilisateurSignaleId, utilisateurNom = 'cet utilisateur', trajetId } = route.params || {};
  const [motif, setMotif] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const envoyer = async () => {
    if (!motif) return Alert.alert('Motif requis', 'Choisissez le motif du signalement.');
    if (commentaire.trim().length < 10) return Alert.alert('Précisez', 'Décrivez la situation en quelques mots (10 caractères minimum).');
    setEnvoi(true);
    try {
      await api.post('/reports', { utilisateurSignaleId, trajetId, motif, commentaire: commentaire.trim() });
      Alert.alert('Signalement envoyé', "Merci. L'administration d'UniRide va l'examiner. Votre identité n'est pas communiquée à la personne signalée.", [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Envoi impossible', erreurApi(err));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Screen
      header={<Header title="Signaler un problème" subtitle={`Concernant ${utilisateurNom}`} onBack={() => navigation.goBack()} />}
      footer={<Button title="Envoyer le signalement" variant="primary" icon="send" onPress={envoyer} loading={envoi} />}
      keyboard
    >
      <Notice tone="info" icon="shield-checkmark-outline" text="Votre signalement est confidentiel et traité par l'administration." />
      <Text style={[font.h3, { marginBottom: spacing.md }]}>Que s'est-il passé ?</Text>
      {MOTIFS.map((m) => {
        const sel = motif === m.id;
        return (
          <Pressable key={m.id} onPress={() => setMotif(m.id)} style={[styles.motif, sel && styles.motifSel]}>
            <Ionicons name={m.icone} size={22} color={sel ? colors.danger : colors.muted} />
            <View style={{ flex: 1, marginHorizontal: spacing.md }}>
              <Text style={[font.label, sel && { color: colors.danger }]}>{m.label}</Text>
              <Text style={font.caption}>{m.description}</Text>
            </View>
            <Ionicons name={sel ? 'radio-button-on' : 'radio-button-off'} size={22} color={sel ? colors.danger : colors.border} />
          </Pressable>
        );
      })}
      <Input
        label="Détails"
        placeholder="Décrivez précisément les faits (date, lieu, ce qui s'est passé)…"
        value={commentaire}
        onChangeText={setCommentaire}
        multiline
        maxLength={1000}
        style={{ marginTop: spacing.md }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  motif: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginBottom: spacing.sm,
  },
  motifSel: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
});
