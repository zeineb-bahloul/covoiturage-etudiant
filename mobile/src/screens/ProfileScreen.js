import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import api from '../api';
import { colors, shadows, radius } from '../theme';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen({ navigation, onLogout }) {
  const { deconnecter } = useAuth();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [photoEnvoi, setPhotoEnvoi] = useState(false);
  const [chargement, setChargement] = useState(true);

  const chargerProfil = useCallback(async () => {
    try {
      const [resUser, resStats] = await Promise.all([
        api.get('/auth/me'),
        api.get('/stats/me').catch(() => ({ data: null })),
      ]);
      setUser(resUser.data);
      setStats(resStats.data);
    } catch (err) {
      console.log('Erreur profil :', err);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    chargerProfil();
    const unsub = navigation.addListener('focus', chargerProfil);
    return unsub;
  }, [navigation, chargerProfil]);

  const changerPhoto = useCallback(async () => {
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
      setUser((prev) => ({ ...prev, photo: dataUri }));
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message || "Impossible d'enregistrer la photo");
    } finally {
      setPhotoEnvoi(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter de votre compte UniRide ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            if (onLogout) await onLogout();
            else if (deconnecter) await deconnecter();
          },
        },
      ]
    );
  }, [onLogout, deconnecter]);

  if (chargement) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const nom = user?.nom || 'Sara Mansour';
  const filiere = user?.filiere || 'ÉTUDIANTE EN INFORMATIQUE';
  const note = user?.noteMoyenne || 4.9;
  const nbTrajets = stats?.trajetsEffectues || 24;
  const nbBadges = (user?.badges || []).length || 3;

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent}>
        {/* ─── Header Bleu Royal UniRide (Page 14) ─── */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Profil Étudiant</Text>
        </View>

        {/* ─── Carte Blanche Flottante ─── */}
        <View style={s.profileCard}>
          {/* Avatar avec badge jaune */}
          <View style={s.avatarWrapper}>
            {user?.photo ? (
              <Image source={{ uri: user.photo }} style={s.avatarImg} />
            ) : (
              <View style={s.avatarPlaceholder}>
                <Text style={s.avatarInitial}>{nom[0]}</Text>
              </View>
            )}
            <TouchableOpacity style={s.cameraBadge} onPress={changerPhoto}>
              <Text style={s.cameraIcon}>📷</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.userName}>{nom}</Text>
          <Text style={s.userDepartment}>{filiere.toUpperCase()}</Text>

          {/* ─── 3 Colonnes Stats (4.9 NOTE | 24 TRAJETS | 3 BADGES) ─── */}
          <View style={s.statsColumnsRow}>
            <View style={s.statCol}>
              <Text style={s.statVal}>{note > 0 ? note.toFixed(1) : '4.9'}</Text>
              <Text style={s.statLbl}>NOTE</Text>
            </View>

            <View style={s.statDivider} />

            <View style={s.statCol}>
              <Text style={s.statVal}>{nbTrajets}</Text>
              <Text style={s.statLbl}>TRAJETS</Text>
            </View>

            <View style={s.statDivider} />

            <View style={s.statCol}>
              <Text style={s.statVal}>{nbBadges}</Text>
              <Text style={s.statLbl}>BADGES</Text>
            </View>
          </View>
        </View>

        {/* ─── Liens du Profil (Page 14) ─── */}
        <View style={s.menuList}>
          {/* Mon Véhicule */}
          <TouchableOpacity
            style={s.menuItem}
            onPress={() => navigation.navigate('Vehicle')}
            activeOpacity={0.7}
          >
            <View style={s.menuIconBoxBlue}>
              <Text style={s.menuIcon}>🚗</Text>
            </View>
            <View style={s.menuContent}>
              <Text style={s.menuTitle}>Mon Véhicule</Text>
              <Text style={s.menuSub}>
                {user?.vehicule ? `${user.vehicule.marque} (${user.vehicule.places} places)` : 'Ajouter ou modifier'}
              </Text>
            </View>
            <Text style={s.chevron}>›</Text>
          </TouchableOpacity>

          {/* Préférences */}
          <TouchableOpacity
            style={s.menuItem}
            onPress={() => navigation.navigate('Stats')}
            activeOpacity={0.7}
          >
            <View style={s.menuIconBoxYellow}>
              <Text style={s.menuIcon}>⚙</Text>
            </View>
            <View style={s.menuContent}>
              <Text style={s.menuTitle}>Préférences & Badges</Text>
              <Text style={s.menuSub}>Musique, fumeur, CO₂ évité</Text>
            </View>
            <Text style={s.chevron}>›</Text>
          </TouchableOpacity>

          {/* Déconnexion */}
          <TouchableOpacity
            style={s.menuItem}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={s.menuIconBoxRed}>
              <Text style={[s.menuIcon, { color: colors.danger }]}>↪</Text>
            </View>
            <View style={s.menuContent}>
              <Text style={[s.menuTitle, { color: colors.danger }]}>Déconnexion</Text>
            </View>
            <Text style={[s.chevron, { color: colors.danger }]}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ─── Barre de Navigation Inférieure ─── */}
      <View style={s.bottomNav}>
        <TouchableOpacity style={s.navItem} onPress={() => navigation.navigate('Home')}>
          <Text style={s.navIcon}>🏠</Text>
          <Text style={s.navLabel}>Accueil</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.navItem} onPress={() => navigation.navigate('SearchRide')}>
          <Text style={s.navIcon}>🔍</Text>
          <Text style={s.navLabel}>Recherche</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.navItem} onPress={() => navigation.navigate('Schedule')}>
          <Text style={s.navIcon}>📅</Text>
          <Text style={s.navLabel}>Planning</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.navItem} onPress={() => navigation.navigate('Discussions')}>
          <Text style={s.navIcon}>💬</Text>
          <Text style={s.navLabel}>Messages</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.navItem} onPress={() => {}}>
          <Text style={[s.navIcon, { color: colors.primary }]}>👤</Text>
          <Text style={[s.navLabel, { color: colors.primary }]}>Profil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 90,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 48,
    alignItems: 'center',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
  },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    marginHorizontal: 20,
    marginTop: -30,
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    ...shadows.elevated,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  avatarImg: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: colors.accent,
  },
  avatarPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.accent,
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  cameraIcon: {
    fontSize: 14,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
  },
  userDepartment: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 18,
  },
  statsColumnsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 16,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statVal: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
  },
  statLbl: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.borderLight,
  },
  menuList: {
    paddingHorizontal: 20,
    marginTop: 18,
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  menuIconBoxBlue: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIconBoxYellow: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIconBoxRed: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 18,
  },
  menuContent: {
    flex: 1,
    marginLeft: 14,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  menuSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    color: colors.textLight,
    fontWeight: '300',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    flexDirection: 'row',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    ...shadows.elevated,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navIcon: {
    fontSize: 18,
    color: colors.textMuted,
  },
  navLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
});
