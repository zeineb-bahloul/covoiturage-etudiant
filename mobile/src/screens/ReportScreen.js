import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import api from '../api';
import UniHeader from '../components/UniHeader';
import { colors, shadows, radius } from '../theme';

export default function ReportScreen({ route, navigation }) {
  const {
    utilisateurSignaleId,
    utilisateurNom = 'Utilisateur',
    trajetId,
  } = route.params || {};

  const [motif, setMotif] = useState('comportement_inapproprie');
  const [commentaire, setCommentaire] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const motifs = [
    {
      id: 'comportement_inapproprie',
      label: 'Comportement inappropri\u00e9',
      description: 'Propos irrespectueux ou attitude d\u00e9plac\u00e9e',
    },
    {
      id: 'conduite_dangereuse',
      label: 'Conduite dangereuse',
      description: 'Exc\u00e8s de vitesse, non-respect du code de la route',
    },
    {
      id: 'retard_excessif',
      label: 'Retard excessif (> 20 min)',
      description: 'Absence ou retard majeur sans pr\u00e9venir',
    },
    {
      id: 'annulation_imprevue',
      label: 'Annulation au dernier moment',
      description: 'A annul\u00e9 le trajet quelques minutes avant',
    },
    {
      id: 'autre',
      label: 'Autre probl\u00e8me',
      description: 'Autre situation anormale constat\u00e9e',
    },
  ];

  const envoyerSignalement = useCallback(async () => {
    if (!commentaire.trim()) {
      Alert.alert('Pr\u00e9cision requise', 'Veuillez d\u00e9crire bri\u00e8vement ce qui s\u2019est pass\u00e9.');
      return;
    }

    if (!utilisateurSignaleId) {
      Alert.alert('Erreur', 'Identifiant de l\u2019utilisateur manquant.');
      return;
    }

    setEnvoiEnCours(true);
    try {
      await api.post('/reports', {
        utilisateurSignaleId,
        trajetId: trajetId || null,
        motif,
        commentaire: commentaire.trim(),
      });

      Alert.alert(
        'Signalement transmis',
        'Merci pour votre vigilance. L\u2019administration d\u2019UniRide \u00e9tudie chaque signalement pour pr\u00e9server la s\u00e9curit\u00e9 sur le campus.',
        [{ text: 'Compris', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur lors de l\u2019envoi';
      Alert.alert('Erreur', msg);
    } finally {
      setEnvoiEnCours(false);
    }
  }, [commentaire, utilisateurSignaleId, trajetId, motif, navigation]);

  return (
    <View style={styles.container}>
      <UniHeader
        title="Signaler un souci"
        subtitle="S\u00e9curit\u00e9 & Communaut\u00e9 ISET"
        navigation={navigation}
        showBack={true}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Bandeau d'information s\u00e9curit\u00e9 */}
        <View style={styles.infoBandeau}>
          <View style={styles.infoDot} />
          <Text style={styles.infoBandeauTexte}>
            Vous signalez <Text style={{ fontWeight: 'bold' }}>{utilisateurNom}</Text>. Votre d\u00e9marche reste confidentielle.
          </Text>
        </View>

        <Text style={styles.sectionTitre}>MOTIF DU SIGNALEMENT</Text>

        <View style={styles.motifsListe}>
          {motifs.map((m) => {
            const selectionne = motif === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.motifCarte, selectionne && styles.motifCarteSelectionnee]}
                onPress={() => setMotif(m.id)}
                activeOpacity={0.8}
              >
                <View style={styles.motifTextes}>
                  <Text style={[styles.motifLabel, selectionne && styles.motifLabelSelectionne]}>
                    {m.label}
                  </Text>
                  <Text style={styles.motifDescription}>{m.description}</Text>
                </View>
                <View style={[styles.radioCercle, selectionne && styles.radioCercleActif]}>
                  {selectionne && <View style={styles.radioPoint} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitre}>D\u00c9TAILS COMPL\u00c9MENTAIRES</Text>
        <TextInput
          style={styles.champDetails}
          placeholder="D\u00e9crivez avec pr\u00e9cision les faits observ\u00e9s..."
          placeholderTextColor={colors.textLight}
          value={commentaire}
          onChangeText={setCommentaire}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity
          style={styles.boutonEnvoyer}
          onPress={envoyerSignalement}
          disabled={envoiEnCours}
          activeOpacity={0.85}
        >
          {envoiEnCours ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.boutonEnvoyerTexte}>Transmettre le signalement</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.boutonAnnuler}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.boutonAnnulerTexte}>Annuler</Text>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  infoBandeau: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 16,
  },
  infoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    marginRight: 10,
  },
  infoBandeauTexte: {
    fontSize: 13,
    color: '#991B1B',
    flex: 1,
    lineHeight: 18,
  },
  sectionTitre: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 6,
  },
  motifsListe: {
    gap: 8,
    marginBottom: 18,
  },
  motifCarte: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  motifCarteSelectionnee: {
    borderColor: colors.danger,
    backgroundColor: '#FFF5F5',
  },
  motifTextes: {
    flex: 1,
  },
  motifLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  motifLabelSelectionne: {
    color: '#991B1B',
  },
  motifDescription: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  radioCercle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  radioCercleActif: {
    borderColor: colors.danger,
  },
  radioPoint: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
  },
  champDetails: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    fontSize: 14,
    color: colors.text,
    minHeight: 90,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  boutonEnvoyer: {
    backgroundColor: colors.danger,
    paddingVertical: 15,
    borderRadius: radius.full,
    alignItems: 'center',
    marginBottom: 10,
    ...shadows.elevated,
  },
  boutonEnvoyerTexte: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  boutonAnnuler: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  boutonAnnulerTexte: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
