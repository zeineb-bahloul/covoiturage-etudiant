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
  const [telephone, setTelephone] = useState('');
  const [nonFumeur, setNonFumeur] = useState(true);
  const [mixte, setMixte] = useState(true);
  const [musique, setMusique] = useState('aucune');
  const [note, setNote] = useState(0);
  const [nombreAvis, setNombreAvis] = useState(0);
  const [photo, setPhoto] = useState('');
  const [badges, setBadges] = useState([]);
  const [stats, setStats] = useState(null);
  const [vehicule, setVehicule] = useState(null);
  const [photoEnvoi, setPhotoEnvoi] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);

  const chargerProfil = useCallback(async () => {
    try {
      const [resUser, resStats] = await Promise.all([
        api.get('/auth/me'),
        api.get('/stats/me').catch(() => ({ data: null })),
      ]);

      const data = resUser.data;
      setNom(data.nom || '');
      setEmail(data.email || '');
      setFiliere(data.filiere || '');
      setAdresse(data.adresse || '');
      setTelephone(data.telephone || '');
      setNonFumeur(data.preferences?.nonFumeur ?? true);
      setMixte(data.preferences?.mixte ?? true);
      setMusique(data.preferences?.musique || 'aucune');
      setNote(data.noteMoyenne || 0);
      setNombreAvis(data.nombreAvis || 0);
      setPhoto(data.photo || '');
      setBadges(data.badges || ['Pionnier ISET 🎓']);
      setVehicule(data.vehicule || null);
      setStats(resStats.data);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de charger le profil');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    chargerProfil();
    const unsubscribe = navigation.addListener('focus', chargerProfil);
    return unsubscribe;
  }, [navigation, chargerProfil]);

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
        titre="Mon Espace"
        sousTitre="Profil & Impact Écologique"
        onBack={() => navigation.navigate('Home')}
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
            <Text style={styles.ratingBadgeText}>
              ⭐ {note > 0 ? note.toFixed(1) : '5.0'} / 5 ({nombreAvis} avis)
            </Text>
          </View>

          {/* Badges de l'utilisateur (US17) */}
          <View style={styles.badgesRow}>
            {badges.map((b, i) => (
              <View key={i} style={styles.badgePill}>
                <Text style={styles.badgePillText}>{b}</Text>
              </View>
            ))}
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

        {/* Aperçu Mes Statistiques (US16 & US17) */}
        <TouchableOpacity
          style={styles.statsCard}
          onPress={() => navigation.navigate('Stats')}
          activeOpacity={0.8}
        >
          <View style={styles.statsCardHeader}>
            <View>
              <Text style={styles.statsCardTitle}>Mes Statistiques & Impact</Text>
              <Text style={styles.statsCardSub}>Économies et écologie sur le campus</Text>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statMiniCol}>
              <Text style={styles.statMiniValue}>{stats?.argentEconomise || 0} DT</Text>
              <Text style={styles.statMiniLabel}>Économisés</Text>
            </View>
            <View style={styles.statMiniDivider} />
            <View style={styles.statMiniCol}>
              <Text style={styles.statMiniValue}>{stats?.co2Economise || 0} kg</Text>
              <Text style={styles.statMiniLabel}>CO₂ évité</Text>
            </View>
            <View style={styles.statMiniDivider} />
            <View style={styles.statMiniCol}>
              <Text style={styles.statMiniValue}>{stats?.trajetsEffectues || 0}</Text>
              <Text style={styles.statMiniLabel}>Trajets</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Raccourcis Véhicule / Réservations / Trajets / Discussions */}
        <View style={styles.linksCard}>
          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => navigation.navigate('Discussions')}
          >
            <Text style={styles.linkIcon}>💬</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.linkTitle}>Mes Discussions</Text>
              <Text style={styles.linkSub}>Échanger avec les conducteurs et passagers</Text>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

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

        {/* Sécurité et Signalement */}
        <TouchableOpacity
          style={styles.boutonSignalerProbleme}
          onPress={() => navigation.navigate('Report', {})}
          activeOpacity={0.8}
        >
          <Text style={styles.iconeBouclier}>🛡️</Text>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.titreSignaler}>Signaler un incident ou un utilisateur</Text>
            <Text style={styles.descSignaler}>Garantir la sécurité et le respect de la communauté</Text>
          </View>
          <Text style={styles.arrowIcon}>→</Text>
        </TouchableOpacity>

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
    padding: 20,
    alignItems: 'center',
    marginTop: -20,
    marginBottom: 16,
    ...shadows.elevated,
  },
  avatarImg: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
    borderColor: '#86EFAC',
    marginBottom: 10,
  },
  avatarPlaceholder: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#86EFAC',
    marginBottom: 10,
  },
  avatarPlaceholderText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  profileDepartment: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: '600',
    marginBottom: 10,
  },
  ratingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginBottom: 10,
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  badgePill: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgePillText: {
    fontSize: 11,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  photoActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  photoActionText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  photoDeleteText: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 13,
  },
  statsCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    ...shadows.card,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  statsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  statsCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  statsCardSub: {
    fontSize: 11,
    color: colors.textLight,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
  },
  statMiniCol: {
    alignItems: 'center',
  },
  statMiniValue: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  statMiniLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statMiniDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  linksCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
    ...shadows.card,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  linkIcon: {
    fontSize: 22,
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  linkSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  arrowIcon: {
    fontSize: 16,
    color: colors.textLight,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 4,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    ...shadows.card,
  },
  cardTitre: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  prefTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  prefSub: {
    fontSize: 11,
    color: colors.textLight,
  },
  musiqueRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  musiqueChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  musiqueChipActif: {
    backgroundColor: colors.primary,
  },
  musiqueChipTexte: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  musiqueChipTexteActif: {
    color: colors.white,
  },
  boutonEnregistrer: {
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  boutonEnregistrerTexte: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  boutonSignalerProbleme: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    ...shadows.card,
  },
  iconeBouclier: {
    fontSize: 22,
  },
  titreSignaler: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9F1239',
  },
  descSignaler: {
    fontSize: 11,
    color: '#BE123C',
    marginTop: 1,
  },
  boutonDeconnexion: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  boutonDeconnexionTexte: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 14,
  },
});
