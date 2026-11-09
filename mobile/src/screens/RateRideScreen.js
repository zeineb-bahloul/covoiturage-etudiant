import React, { useState, useCallback } from 'react';
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
  Platform,
} from 'react-native';
import api from '../api';
import { colors, shadows, radius } from '../theme';

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
  const [badgesSelectionnes, setBadgesSelectionnes] = useState(['Ponctuel', 'Sympathique']);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const badgesDisponibles =
    roleCible === 'conducteur'
      ? [
          { id: 'Ponctuel', label: '⏱️ Ponctuel' },
          { id: 'Conduite Souple', label: '🚗 Conduite souple' },
          { id: 'Sympathique', label: '😊 Sympathique' },
          { id: 'Éco-Conducteur', label: '🌿 Éco-conducteur' },
        ]
      : [
          { id: 'Ponctuel', label: '⏱️ Ponctuel' },
          { id: 'Sympathique', label: '😊 Sympathique' },
          { id: 'Respectueux', label: '🤝 Respectueux' },
        ];

  const basculerBadge = useCallback((badgeId) => {
    setBadgesSelectionnes((prev) =>
      prev.includes(badgeId) ? prev.filter((b) => b !== badgeId) : [...prev, badgeId]
    );
  }, []);

  const getEtoileLabel = (val) => {
    switch (val) {
      case 5:
        return '⭐ Expérience Excellente !';
      case 4:
        return '👍 Très bien';
      case 3:
        return '👌 Correct';
      case 2:
        return '😕 Décevant';
      case 1:
        return '❌ Mauvaise expérience';
      default:
        return '';
    }
  };

  const envoyerAvis = useCallback(async () => {
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
        'Merci pour votre avis !',
        'Votre évaluation aide à renforcer la confiance et la qualité du covoiturage à l’ISET Nabeul.',
        [{ text: 'Continuer', onPress: () => navigation.navigate('Home') }]
      );
    } catch (err) {
      const msg = err.response?.data?.message || "Impossible d'enregistrer votre avis";
      Alert.alert('Information', msg, [
        { text: 'OK', onPress: () => navigation.navigate('Home') },
      ]);
    } finally {
      setEnvoiEnCours(false);
    }
  }, [cibleId, trajetId, note, commentaire, badgesSelectionnes, roleCible, navigation]);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scrollContent}>
      {/* ─── Header Célébration (Page 13 PDF) ─── */}
      <View style={s.celebrationHeader}>
        <View style={s.checkCircle}>
          <Text style={s.checkIcon}>✓</Text>
        </View>
        <Text style={s.celebrationTitle}>Trajet Terminé !</Text>
        <Text style={s.celebrationSub}>
          Merci d'avoir voyagé avec UniRide. Partagez votre expérience avec vos camarades.
        </Text>
      </View>

      {/* ─── Carte d'évaluation ─── */}
      <View style={s.card}>
        <View style={s.avatarContainer}>
          {ciblePhoto ? (
            <Image source={{ uri: ciblePhoto }} style={s.avatar} />
          ) : (
            <View style={s.avatarPlaceholder}>
              <Text style={s.avatarInitial}>
                {cibleNom ? cibleNom[0].toUpperCase() : 'U'}
              </Text>
            </View>
          )}
        </View>

        <Text style={s.targetName}>{cibleNom}</Text>
        <View style={s.roleBadge}>
          <Text style={s.roleBadgeText}>{roleCible.toUpperCase()}</Text>
        </View>

        {/* Étoiles interactives */}
        <View style={s.starsRow}>
          {[1, 2, 3, 4, 5].map((val) => (
            <TouchableOpacity
              key={val}
              onPress={() => setNote(val)}
              activeOpacity={0.7}
              style={s.starBtn}
            >
              <Text style={[s.starIcon, val <= note ? s.starActive : s.starInactive]}>
                ★
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.scoreLabel}>{getEtoileLabel(note)}</Text>

        {/* Badges de compliment */}
        <Text style={s.badgesSectionTitle}>Qu'avez-vous particulièrement apprécié ?</Text>
        <View style={s.badgesRow}>
          {badgesDisponibles.map((badge) => {
            const isSelected = badgesSelectionnes.includes(badge.id);
            return (
              <TouchableOpacity
                key={badge.id}
                style={[s.badgeChip, isSelected && s.badgeChipActive]}
                onPress={() => basculerBadge(badge.id)}
                activeOpacity={0.8}
              >
                <Text style={[s.badgeChipText, isSelected && s.badgeChipTextActive]}>
                  {badge.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Commentaire optionnel */}
        <TextInput
          style={s.commentInput}
          placeholder="Un mot pour remercier ou donner un conseil... (optionnel)"
          placeholderTextColor="#94A3B8"
          value={commentaire}
          onChangeText={setCommentaire}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* ─── Boutons d'action ─── */}
      <TouchableOpacity
        style={s.submitBtn}
        onPress={envoyerAvis}
        disabled={envoiEnCours}
        activeOpacity={0.85}
      >
        {envoiEnCours ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={s.submitBtnText}>Valider mon évaluation</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={s.skipBtn}
        onPress={() => navigation.navigate('Home')}
        activeOpacity={0.7}
      >
        <Text style={s.skipBtnText}>Passer et retourner à l'accueil</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 36,
    paddingBottom: 40,
  },
  celebrationHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    ...shadows.elevated,
  },
  checkIcon: {
    color: colors.navy,
    fontSize: 32,
    fontWeight: '900',
  },
  celebrationTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  celebrationSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.card,
  },
  avatarContainer: {
    marginBottom: 10,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    borderColor: colors.accent,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  targetName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  roleBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
    marginBottom: 16,
  },
  roleBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  starBtn: {
    padding: 4,
  },
  starIcon: {
    fontSize: 36,
  },
  starActive: {
    color: '#EAB308',
  },
  starInactive: {
    color: '#E2E8F0',
  },
  scoreLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 16,
  },
  badgesSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    width: '100%',
  },
  badgeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  badgeChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: colors.primary,
  },
  badgeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  badgeChipTextActive: {
    color: colors.primary,
  },
  commentInput: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    fontSize: 13,
    color: '#0F172A',
    minHeight: 70,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    ...shadows.elevated,
    marginBottom: 12,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  skipBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
});
