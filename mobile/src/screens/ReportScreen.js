import React, { useState } from 'react';
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
import { colors, shadows } from '../theme';

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
      label: 'Comportement inapproprié',
      description: 'Propos irrespectueux, harcèlement ou attitude déplacée',
      icone: '⚠️',
    },
    {
      id: 'conduite_dangereuse',
      label: 'Conduite dangereuse',
      description: 'Excès de vitesse, non-respect du code de la route',
      icone: '🚗',
    },
    {
      id: 'retard_excessif',
      label: 'Retard excessif (> 20 min)',
      description: 'Absence ou retard majeur sans prévenir',
      icone: '⏰',
    },
    {
      id: 'annulation_imprevue',
      label: 'Annulation au dernier moment',
      description: 'A annulé le trajet quelques minutes avant',
      icone: '❌',
    },
    {
      id: 'autre',
      label: 'Autre problème',
      description: 'Autre situation anormale constatée',
      icone: '📝',
    },
  ];

  const envoyerSignalement = async () => {
    if (!commentaire.trim()) {
      Alert.alert('Précision requise', 'Veuillez décrire brièvement ce qui s’est passé.');
      return;
    }

    if (!utilisateurSignaleId) {
      Alert.alert('Erreur', 'Identifiant de l’utilisateur manquant.');
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
        'Signalement transmis 🛡️',
        'Merci pour votre vigilance. L’administration d’UniRide étudie chaque signalement pour préserver un climat sécurisé sur le campus.',
        [{ text: 'Compris', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      console.log('Erreur envoi signalement :', err);
      const msg = err.response?.data?.message || 'Erreur lors de l’envoi';
      Alert.alert('Erreur', msg);
    } finally {
      setEnvoiEnCours(false);
    }
  };

  return (
    <View style={styles.container}>
      <UniHeader
        titre="Signaler un souci"
        sousTitre="Sécurité & Communauté ISET"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Bandeau d'information sécurité */}
        <View style={styles.infoBandeau}>
          <Text style={styles.infoBandeauIcone}>🛡️</Text>
          <Text style={styles.infoBandeauTexte}>
            Vous signalez <Text style={{ fontWeight: 'bold' }}>{utilisateurNom}</Text>. Votre démarche reste strictement confidentielle.
          </Text>
        </View>

        <Text style={styles.sectionTitre}>QUEL EST LE MOTIF PRINCIPAL ?</Text>

        {/* Liste des motifs sous forme de cartes sélectionnables */}
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
                <View style={styles.motifIconeCercle}>
                  <Text style={styles.motifIcone}>{m.icone}</Text>
                </View>
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

        {/* Détails du commentaire */}
        <Text style={styles.sectionTitre}>DÉTAILS COMPLÉMENTAIRES</Text>
        <TextInput
          style={styles.champDetails}
          placeholder="Décrivez avec précision les faits observés..."
          placeholderTextColor={colors.textLight}
          value={commentaire}
          onChangeText={setCommentaire}
          multiline
          numberOfLines={5}
        />

        {/* Boutons */}
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  infoBandeau: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  infoBandeauIcone: {
    fontSize: 24,
    marginRight: 10,
  },
  infoBandeauTexte: {
    fontSize: 13,
    color: '#991B1B',
    flex: 1,
    lineHeight: 18,
  },
  sectionTitre: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textLight,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 6,
  },
  motifsListe: {
    gap: 10,
    marginBottom: 20,
  },
  motifCarte: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...shadows.card,
  },
  motifCarteSelectionnee: {
    borderColor: '#EF4444',
    backgroundColor: '#FFF5F5',
  },
  motifIconeCercle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  motifIcone: {
    fontSize: 20,
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
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  radioCercleActif: {
    borderColor: '#EF4444',
  },
  radioPoint: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  champDetails: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    fontSize: 14,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 24,
    ...shadows.card,
  },
  boutonEnvoyer: {
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    marginBottom: 12,
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

