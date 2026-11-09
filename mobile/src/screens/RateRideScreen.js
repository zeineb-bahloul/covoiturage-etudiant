import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import api from '../api';
import { colors, shadows } from '../theme';

export default function RateRideScreen({ route, navigation }) {
  const {
    trajetId,
    cibleId,
    cibleNom = 'Conducteur UniRide',
    ciblePhoto,
    roleCible = 'conducteur',
  } = route.params || {};

  const [note, setNote] = useState(5);
  const [commentaire, setCommentaire] = useState('');
  const [badgesSelectionnes, setBadgesSelectionnes] = useState(['Ponctuel ⏰', 'Sympathique 😊']);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const prenom = cibleNom ? cibleNom.split(' ')[0] : 'votre covoitureur';

  // Badges disponibles selon le rôle
  const badgesDisponibles = roleCible === 'conducteur'
    ? [
        { id: 'Ponctuel ⏰', label: 'Ponctuel ⏰' },
        { id: 'Conduite Souple 🚗', label: 'Conduite Souple 🚗' },
        { id: 'Sympathique 😊', label: 'Sympathique 😊' },
        { id: 'Éco-Conducteur 🌱', label: 'Éco-Conducteur 🌱' },
      ]
    : [
        { id: 'Ponctuel ⏰', label: 'Ponctuel ⏰' },
        { id: 'Sympathique 😊', label: 'Sympathique 😊' },
        { id: 'Respectueux 🤝', label: 'Respectueux 🤝' },
      ];

  const basculerBadge = (badgeId) => {
    if (badgesSelectionnes.includes(badgeId)) {
      setBadgesSelectionnes(badgesSelectionnes.filter((b) => b !== badgeId));
    } else {
      setBadgesSelectionnes([...badgesSelectionnes, badgeId]);
    }
  };

  const getEtoileLabel = (val) => {
    switch (val) {
      case 5:
        return 'Excellent ! 🌟';
      case 4:
        return 'Très bien 👍';
      case 3:
        return 'Correct 🙂';
      case 2:
        return 'Décevant 😐';
      case 1:
        return 'Mauvaise expérience ⚠️';
      default:
        return '';
    }
  };

  const envoyerAvis = async () => {
    if (!cibleId || !trajetId) {
      Alert.alert('Erreur', 'Données de trajet manquantes');
      navigation.navigate('Home');
      return;
    }

    setEnvoiEnCours(true);
    try {
      await api.post('/reviews', {
        cibleId,
        trajetId,
        note,
        commentaire: commentaire.trim(),
        badges: badgesSelectionnes,
        roleCible,
      });

      Alert.alert(
        'Merci pour votre avis ! 🎉',
        'Votre évaluation aide à renforcer la confiance et la qualité du covoiturage à l’ISET Nabeul.',
        [{ text: 'Super !', onPress: () => navigation.navigate('Home') }]
      );
    } catch (err) {
      console.log('Erreur envoi review :', err);
      const msg = err.response?.data?.message || "Impossible d'enregistrer votre avis";
      Alert.alert('Information', msg, [
        { text: 'OK', onPress: () => navigation.navigate('Home') },
      ]);
    } finally {
      setEnvoiEnCours(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Grand symbole de succès au sommet (Fidèle à la Maquette Image 3) */}
      <View style={styles.iconeSuccesConteneur}>
        <View style={styles.iconeSuccesCercle}>
          <Text style={styles.iconeSuccesCheck}>✓</Text>
          <View style={styles.pastilleFeuille}>
            <Text style={styles.iconeFeuille}>🍃</Text>
          </View>
        </View>
      </View>

      <Text style={styles.titrePrincipal}>Trajet Terminé</Text>
      <Text style={styles.sousTitre}>
        Merci d’avoir utilisé UniRide. Prenez un moment pour noter votre expérience.
      </Text>

      {/* Carte Utilisateur à Noter */}
      <View style={styles.cardAvis}>
        <View style={styles.avatarWrapper}>
          {ciblePhoto ? (
            <Image source={{ uri: ciblePhoto }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {cibleNom ? cibleNom[0].toUpperCase() : 'U'}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.nomCible}>{cibleNom}</Text>
        <Text style={styles.roleCibleBadge}>
          {roleCible.toUpperCase()}
        </Text>

        {/* Étoiles interactives */}
        <View style={styles.etoilesLigne}>
          {[1, 2, 3, 4, 5].map((val) => (
            <TouchableOpacity
              key={val}
              onPress={() => setNote(val)}
              activeOpacity={0.7}
              style={styles.etoileBouton}
            >
              <Text style={[styles.etoileIcone, val <= note ? styles.etoilePleine : styles.etoileVide]}>
                ★
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.etoileLabel}>{getEtoileLabel(note)}</Text>

        {/* Commentaire optionnel */}
        <View style={styles.commentaireSection}>
          <Text style={styles.champLabel}>VOTRE COMMENTAIRE (OPTIONNEL)</Text>
          <TextInput
            style={styles.commentaireInput}
            placeholder="Partagez votre expérience sur ce trajet..."
            placeholderTextColor={colors.textLight}
            value={commentaire}
            onChangeText={setCommentaire}
            multiline
            numberOfLines={4}
          />
        </View>
      </View>

      {/* Badges à attribuer */}
      <View style={styles.sectionBadges}>
        <Text style={styles.titreBadges}>
          BADGES POUR {prenom.toUpperCase()}
        </Text>
        <View style={styles.badgesGrille}>
          {badgesDisponibles.map((b) => {
            const actif = badgesSelectionnes.includes(b.id);
            return (
              <TouchableOpacity
                key={b.id}
                style={[styles.badgePill, actif && styles.badgePillActif]}
                onPress={() => basculerBadge(b.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.badgePillTexte, actif && styles.badgePillTexteActif]}>
                  {b.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Bouton d'action principal */}
      <TouchableOpacity
        style={styles.boutonEnvoyer}
        onPress={envoyerAvis}
        disabled={envoiEnCours}
        activeOpacity={0.85}
      >
        {envoiEnCours ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Text style={styles.boutonEnvoyerTexte}>Envoyer l'avis</Text>
        )}
      </TouchableOpacity>

      {/* Passer cette étape */}
      <TouchableOpacity
        style={styles.boutonPasser}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.boutonPasserTexte}>Passer cette étape</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 40,
    alignItems: 'center',
  },
  iconeSuccesConteneur: {
    marginBottom: 20,
    position: 'relative',
  },
  iconeSuccesCercle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.elevated,
  },
  iconeSuccesCheck: {
    fontSize: 44,
    color: colors.white,
    fontWeight: 'bold',
  },
  pastilleFeuille: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ECFDF5',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  iconeFeuille: {
    fontSize: 14,
  },
  titrePrincipal: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  sousTitre: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 15,
  },
  cardAvis: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    marginBottom: 20,
    ...shadows.elevated,
  },
  avatarWrapper: {
    marginBottom: 10,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#86EFAC',
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#86EFAC',
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
  },
  nomCible: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  roleCibleBadge: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.textLight,
    marginBottom: 16,
  },
  etoilesLigne: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 6,
  },
  etoileBouton: {
    padding: 6,
  },
  etoileIcone: {
    fontSize: 34,
  },
  etoilePleine: {
    color: '#FBBF24',
  },
  etoileVide: {
    color: '#E2E8F0',
  },
  etoileLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryDark,
    marginBottom: 18,
  },
  commentaireSection: {
    width: '100%',
  },
  champLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textLight,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  commentaireInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    fontSize: 13,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sectionBadges: {
    width: '100%',
    marginBottom: 24,
  },
  titreBadges: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textLight,
    letterSpacing: 0.8,
    marginBottom: 12,
    textAlign: 'center',
  },
  badgesGrille: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  badgePill: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    ...shadows.card,
  },
  badgePillActif: {
    backgroundColor: '#ECFDF5',
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  badgePillTexte: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  badgePillTexteActif: {
    color: colors.primaryDark,
    fontWeight: '800',
  },
  boutonEnvoyer: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 14,
    ...shadows.elevated,
  },
  boutonEnvoyerTexte: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  boutonPasser: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  boutonPasserTexte: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: '600',
  },
});

