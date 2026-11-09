import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import api from '../api';
import { colors, shadows, radius } from '../theme';
import UniHeader from '../components/UniHeader';

const COULEURS = [
  { valeur: 'blanc', label: 'Blanc', hex: '#FFFFFF' },
  { valeur: 'noir', label: 'Noir', hex: '#1E293B' },
  { valeur: 'gris', label: 'Gris', hex: '#64748B' },
  { valeur: 'argent', label: 'Argent', hex: '#CBD5E1' },
  { valeur: 'rouge', label: 'Rouge', hex: '#EF4444' },
  { valeur: 'bleu', label: 'Bleu', hex: '#3B82F6' },
  { valeur: 'vert', label: 'Vert', hex: '#10B981' },
  { valeur: 'jaune', label: 'Jaune', hex: '#FACC15' },
  { valeur: 'orange', label: 'Orange', hex: '#F97316' },
  { valeur: 'marron', label: 'Marron', hex: '#78350F' },
  { valeur: 'autre', label: 'Autre', hex: '#8B5CF6' },
];

export default function VehicleScreen({ navigation }) {
  const [marque, setMarque] = useState('');
  const [couleur, setCouleur] = useState('');
  const [places, setPlaces] = useState('');
  const [matricule, setMatricule] = useState('');
  const [existe, setExiste] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    api
      .get('/auth/me')
      .then(({ data }) => {
        if (data.vehicule) {
          setMarque(data.vehicule.marque);
          setCouleur(data.vehicule.couleur || '');
          setPlaces(String(data.vehicule.places));
          setMatricule(data.vehicule.matricule);
          setExiste(true);
        }
      })
      .catch(() => Alert.alert('Erreur', 'Impossible de charger le v\u00e9hicule'))
      .finally(() => setChargement(false));
  }, []);

  const enregistrer = useCallback(async () => {
    if (!marque.trim() || !couleur || !places || !matricule.trim()) {
      Alert.alert('Champs obligatoires', 'Veuillez remplir tous les champs, y compris la couleur du v\u00e9hicule.');
      return;
    }
    const nbPlaces = Number(places);
    if (!Number.isInteger(nbPlaces) || nbPlaces < 1 || nbPlaces > 8) {
      Alert.alert('Places invalides', 'Le nombre de places doit \u00eatre compris entre 1 et 8.');
      return;
    }

    setEnvoi(true);
    try {
      await api.put('/users/me/vehicule', { marque, couleur, places: nbPlaces, matricule });
      Alert.alert('V\u00e9hicule enregistr\u00e9 !', 'Vous pouvez d\u00e9sormais publier des trajets sur UniRide.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message || 'Impossible de joindre le serveur');
    } finally {
      setEnvoi(false);
    }
  }, [marque, couleur, places, matricule, navigation]);

  const supprimer = useCallback(() => {
    Alert.alert(
      'Retirer le v\u00e9hicule',
      '\u00cates-vous s\u00fbr de vouloir retirer votre v\u00e9hicule ? Vous redeviendrez simple passager.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Oui, retirer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/users/me/vehicule');
              Alert.alert('V\u00e9hicule retir\u00e9');
              navigation.goBack();
            } catch (err) {
              Alert.alert('Erreur', 'Suppression impossible');
            }
          },
        },
      ]
    );
  }, [navigation]);

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
        title="Mon V\u00e9hicule"
        subtitle="Devenir Conducteur ISET"
        navigation={navigation}
        showBack={true}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.infoBanner}>
          <View style={styles.bannerIconBox}>
            <Text style={styles.bannerIconText}>V</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.infoBannerTitre}>Partagez vos trajets</Text>
            <Text style={styles.infoBannerSub}>
              Enregistrez votre v\u00e9hicule pour proposer vos places libres \u00e0 d'autres \u00e9tudiants de l'ISET Nabeul.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>MARQUE ET MOD\u00c8LE</Text>
          <TextInput
            style={styles.input}
            value={marque}
            onChangeText={setMarque}
            placeholder="Ex : Peugeot 208, Renault Clio, Polo..."
            placeholderTextColor={colors.textLight}
          />

          <Text style={styles.label}>
            COULEUR{couleur ? ` : ${COULEURS.find((c) => c.valeur === couleur)?.label}` : ''}
          </Text>
          <View style={styles.couleursGrid}>
            {COULEURS.map((c) => {
              const actif = couleur === c.valeur;
              return (
                <TouchableOpacity
                  key={c.valeur}
                  onPress={() => setCouleur(c.valeur)}
                  style={[
                    styles.couleurBouton,
                    { backgroundColor: c.hex },
                    actif && styles.couleurBoutonActif,
                  ]}
                  activeOpacity={0.8}
                />
              );
            })}
          </View>

          <Text style={styles.label}>NOMBRE DE PLACES PASSAGERS (1 \u00c0 8)</Text>
          <TextInput
            style={styles.input}
            value={places}
            onChangeText={setPlaces}
            keyboardType="number-pad"
            placeholder="Ex : 3"
            placeholderTextColor={colors.textLight}
          />

          <Text style={styles.label}>MATRICULE</Text>
          <TextInput
            style={styles.input}
            value={matricule}
            onChangeText={setMatricule}
            autoCapitalize="characters"
            placeholder="Ex : 123 TUN 4567"
            placeholderTextColor={colors.textLight}
          />

          <TouchableOpacity
            style={styles.boutonEnregistrer}
            onPress={enregistrer}
            disabled={envoi}
            activeOpacity={0.85}
          >
            {envoi ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.boutonEnregistrerTexte}>
                {existe ? 'Mettre \u00e0 jour le v\u00e9hicule' : 'Enregistrer mon v\u00e9hicule'}
              </Text>
            )}
          </TouchableOpacity>

          {existe && (
            <TouchableOpacity style={styles.boutonSupprimer} onPress={supprimer}>
              <Text style={styles.boutonSupprimerTexte}>Retirer mon v\u00e9hicule</Text>
            </TouchableOpacity>
          )}
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: 14,
    borderRadius: radius.md,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  bannerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerIconText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.white,
  },
  infoBannerTitre: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  infoBannerSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.text,
    marginBottom: 14,
  },
  couleursGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  couleurBouton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: colors.border,
  },
  couleurBoutonActif: {
    borderColor: colors.primary,
    borderWidth: 3,
    transform: [{ scale: 1.1 }],
  },
  boutonEnregistrer: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    ...shadows.elevated,
  },
  boutonEnregistrerTexte: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
  boutonSupprimer: {
    backgroundColor: colors.dangerLight,
    paddingVertical: 12,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  boutonSupprimerTexte: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 13,
  },
});
