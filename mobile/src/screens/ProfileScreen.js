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
  Image,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import api from '../api';
import { colors, shadows } from '../theme';
import UniHeader from '../components/UniHeader';
import { useAuth } from '../context/AuthContext';

const CHOIX_MUSIQUE = [
  { valeur: 'calme', label: 'Calme' },
  { valeur: 'animee', label: 'Animée' },
  { valeur: 'aucune', label: 'Peu importe' },
];

export default function ProfileScreen({ navigation, route, onLogout }) {
  const { deconnecter } = useAuth();
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [filiere, setFiliere] = useState('');
  const [adresse, setAdresse] = useState('');
  const [nonFumeur, setNonFumeur] = useState(true);
  const [mixte, setMixte] = useState(true);
  const [musique, setMusique] = useState('aucune');
  const [note, setNote] = useState(0);
  const [photo, setPhoto] = useState('');
  const [vehicule, setVehicule] = useState(null);
  const [photoEnvoi, setPhotoEnvoi] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    api
      .get('/auth/me')
      .then(({ data }) => {
        setNom(data.nom);
        setEmail(data.email || '');
        setFiliere(data.filiere || '');
        setAdresse(data.adresse || '');
        setNonFumeur(data.preferences?.nonFumeur ?? true);
        setMixte(data.preferences?.mixte ?? true);
        setMusique(data.preferences?.musique || 'aucune');
        setNote(data.noteMoyenne || 0);
        setPhoto(data.photo || '');
        setVehicule(data.vehicule || null);
      })
      .catch(() => Alert.alert('Erreur', 'Impossible de charger le profil'))
      .finally(() => setChargement(false));
  }, []);

  const changerPhoto = async () => {
    const choix = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (choix.canceled) return;

    setPhotoEnvoi(true);
    try {
      const reduite = await ImageManipulator.manipulateAsync(
        choix.assets[0].uri,
        [{ resize: { width: 300 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      const dataUri = `data:image/jpeg;base64,${reduite.base64}`;
      await api.put('/users/me/photo', { photo: dataUri });
      setPhoto(dataUri);
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message || "Impossible d'enregistrer la photo");
    } finally {
      setPhotoEnvoi(false);
    }
  };

  const supprimerPhoto = async () => {
    try {
      await api.delete('/users/me/photo');
      setPhoto('');
    } catch (err) {
      Alert.alert('Erreur', 'Suppression impossible');
    }
  };

  const sauvegarder = async () => {
    if (!nom.trim()) {
      Alert.alert('Attention', 'Le nom ne peut pas être vide');
      return;
    }
    setEnvoi(true);
    try {
      await api.put('/users/me', {
        nom: nom.trim(),
        filiere: filiere.trim(),
        adresse: adresse.trim(),
        preferences: { nonFumeur, mixte, musique },
      });
      Alert.alert('Succès', 'Profil mis à jour');
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message || 'Impossible de joindre le serveur');
    } finally {
      setEnvoi(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Se déconnecter',
      'Êtes-vous sûr de vouloir vous déconnecter de votre compte UniRide ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Oui, me déconnecter',
          style: 'destructive',
          onPress: async () => {
            if (onLogout) {
              await onLogout();
            } else if (deconnecter) {
              await deconnecter();
            }
          },
        },
      ]
    );
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
        title="Mon Espace"
        subtitle="Profil & Préférences"
        navigation={navigation}
        showBack={true}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* En-tête Profil (Fidèle à Image 1 "Mon Espace") */}
        <View style={styles.profileHeroCard}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>{nom ? nom[0].toUpperCase() : 'U'}</Text>
            </View>
          )}

          <Text style={styles.profileName}>{nom}</Text>
          <Text style={styles.profileEmail}>{email}</Text>
          <Text style={styles.profileDepartment}>🎓 {filiere || 'Étudiant ISET Nabeul'}</Text>

          <View style={styles.ratingBadge}>
            <Text style={styles.ratingBadgeText}>⭐ {note > 0 ? note.toFixed(1) : '4.8'} / 5 (Fiabilité)</Text>
          </View>

          <View style={styles.photoActionsRow}>
            <TouchableOpacity onPress={photoEnvoi ? undefined : changerPhoto}>
              <Text style={styles.photoActionText}>
                {photoEnvoi ? 'Chargement...' : photo ? 'Modifier photo' : '+ Ajouter photo'}
              </Text>
            </TouchableOpacity>
            {photo ? (
              <TouchableOpacity onPress={supprimerPhoto}>
                <Text style={styles.photoDeleteText}>Supprimer</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Raccourcis Véhicule / Réservations / Trajets */}
        <View style={styles.linksCard}>
          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => navigation.navigate('Vehicle')}
          >
            <Text style={styles.linkIcon}>🚗</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.linkTitle}>Mon Véhicule</Text>
              <Text style={styles.linkSub}>
                {vehicule ? `${vehicule.marque} (${vehicule.places} places)` : 'Devenir conducteur (aucun véhicule)'}
              </Text>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => navigation.navigate('MyBookings')}
          >
            <Text style={styles.linkIcon}>🎫</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.linkTitle}>Mes Réservations</Text>
              <Text style={styles.linkSub}>Trajets réservés et statut des demandes</Text>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => navigation.navigate('MyRides')}
          >
            <Text style={styles.linkIcon}>🚘</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.linkTitle}>Mes Trajets Publiés</Text>
              <Text style={styles.linkSub}>Gérer mes annonces de covoiturage</Text>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Formulaire des Informations Personnelles */}
        <View style={styles.card}>
          <Text style={styles.cardTitre}>Informations personnelles</Text>

          <Text style={styles.label}>Nom complet</Text>
          <TextInput style={styles.input} value={nom} onChangeText={setNom} />

          <Text style={styles.label}>Filière / Département</Text>
          <TextInput style={styles.input} value={filiere} onChangeText={setFiliere} />

          <Text style={styles.label}>Adresse approximative (quartier, ville)</Text>
          <TextInput
            style={styles.input}
            value={adresse}
            onChangeText={setAdresse}
            placeholder="Ex : Nabeul Centre, Hammamet Nord..."
          />

          <Text style={[styles.cardTitre, { marginTop: 14 }]}>Préférences de covoiturage</Text>

          <View style={styles.prefRow}>
            <View>
              <Text style={styles.prefTitle}>Non-fumeur</Text>
              <Text style={styles.prefSub}>Véhicule strictement sans tabac</Text>
            </View>
            <Switch
              value={nonFumeur}
              onValueChange={setNonFumeur}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={styles.prefRow}>
            <View>
              <Text style={styles.prefTitle}>Trajet mixte accepté</Text>
              <Text style={styles.prefSub}>Ouvert à tous les étudiants de l'institut</Text>
            </View>
            <Switch
              value={mixte}
              onValueChange={setMixte}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <Text style={[styles.label, { marginTop: 12, marginBottom: 8 }]}>Ambiance musicale</Text>
          <View style={styles.musiqueRow}>
            {CHOIX_MUSIQUE.map((choix) => {
              const actif = musique === choix.valeur;
              return (
                <TouchableOpacity
                  key={choix.valeur}
                  onPress={() => setMusique(choix.valeur)}
                  style={[styles.musiqueChip, actif && styles.musiqueChipActif]}
                >
                  <Text style={[styles.musiqueChipTexte, actif && styles.musiqueChipTexteActif]}>
                    {choix.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.boutonEnregistrer}
            onPress={sauvegarder}
            disabled={envoi}
            activeOpacity={0.85}
          >
            {envoi ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.boutonEnregistrerTexte}>Enregistrer les modifications</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Bouton Se déconnecter (Fidèle à l'image 1 de la maquette "Mon Espace") */}
        <TouchableOpacity
          style={styles.boutonDeconnexion}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Text style={styles.boutonDeconnexionTexte}>Se déconnecter</Text>
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
  profileHeroCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  avatarImg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarPlaceholderText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.primary,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
  },
  profileEmail: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  profileDepartment: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryDark,
    marginTop: 4,
  },
  ratingBadge: {
    backgroundColor: colors.badgeGoldBg,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginTop: 10,
  },
  ratingBadgeText: {
    color: colors.badgeGoldText,
    fontSize: 12,
    fontWeight: '800',
  },
  photoActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  photoActionText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
    marginHorizontal: 8,
  },
  photoDeleteText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 13,
    marginHorizontal: 8,
  },
  linksCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  linkIcon: {
    fontSize: 24,
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  linkSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  arrowIcon: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 4,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  cardTitre: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    marginBottom: 14,
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  prefTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  prefSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  musiqueRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  musiqueChip: {
    flex: 1,
    paddingVertical: 10,
    marginRight: 6,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  musiqueChipActif: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  musiqueChipTexte: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  musiqueChipTexteActif: {
    color: colors.white,
  },
  boutonEnregistrer: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  boutonEnregistrerTexte: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
  boutonDeconnexion: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    marginBottom: 24,
  },
  boutonDeconnexionTexte: {
    color: colors.danger,
    fontWeight: '800',
    fontSize: 15,
  },
});
