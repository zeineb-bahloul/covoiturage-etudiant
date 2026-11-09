import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import api from '../api';
import { colors, shadows } from '../theme';

export default function LoginScreen({ navigation, onLogin }) {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const seConnecter = async () => {
    setErreur('');
    if (!email.trim() || !motDePasse) {
      setErreur('Veuillez remplir tous les champs');
      return;
    }
    setEnvoi(true);
    try {
      const { data } = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        motDePasse,
      });
      await onLogin(data.token);
    } catch (err) {
      setErreur(err.response?.data?.message || 'Identifiants invalides ou serveur indisponible');
      setEnvoi(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Entête Vert avec Logo UniRide (Fidèle à l'image 2 de la maquette) */}
        <View style={styles.topBanner}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeIcon}>🚗🍃</Text>
          </View>
          <Text style={styles.brandTitle}>UniRide</Text>
          <Text style={styles.brandSubtitle}>ISET Nabeul · Éco-Covoiturage</Text>
        </View>

        {/* Carte de Connexion Flottante */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Connexion</Text>

          {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}

          <Text style={styles.label}>E-MAIL UNIVERSITAIRE</Text>
          <TextInput
            style={styles.input}
            placeholder="nom.prenom@isetn.tn"
            placeholderTextColor={colors.textLight}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <View style={styles.rowBetween}>
            <Text style={styles.label}>MOT DE PASSE</Text>
            <TouchableOpacity onPress={() => alert('Veuillez contacter le support ISET')}>
              <Text style={styles.motDePasseOublie}>OUBLIÉ ?</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.textLight}
            value={motDePasse}
            onChangeText={setMotDePasse}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.bouton}
            onPress={seConnecter}
            disabled={envoi}
            activeOpacity={0.85}
          >
            {envoi ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.boutonTexte}>Se connecter</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Lien Inscription */}
        <View style={styles.footerLinkRow}>
          <Text style={styles.footerTexte}>Pas encore de compte ? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLien}>Inscrivez-vous ici</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
  },
  topBanner: {
    backgroundColor: colors.primary,
    paddingTop: 50,
    paddingBottom: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...shadows.card,
  },
  logoBadgeIcon: {
    fontSize: 28,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.card,
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  motDePasseOublie: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.text,
    marginBottom: 16,
  },
  bouton: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...shadows.card,
  },
  boutonTexte: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  erreur: {
    color: colors.danger,
    backgroundColor: colors.dangerLight,
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500',
  },
  footerLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    paddingBottom: 20,
  },
  footerTexte: {
    fontSize: 14,
    color: colors.textMuted,
  },
  footerLien: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
});
