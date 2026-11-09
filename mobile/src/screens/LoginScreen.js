import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { colors, shadows, radius } from '../theme';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation, onLogin }) {
  const { connecter } = useAuth();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);

  const seConnecter = useCallback(async () => {
    setErreur('');
    if (!email.trim() || !motDePasse) {
      setErreur('Veuillez renseigner votre e-mail et votre mot de passe.');
      return;
    }

    setChargement(true);
    try {
      if (onLogin) {
        await onLogin(email.trim().toLowerCase(), motDePasse);
      } else if (connecter) {
        await connecter(email.trim().toLowerCase(), motDePasse);
      }
    } catch (err) {
      setErreur(
        err.response?.data?.message ||
        'Identifiants incorrects ou problème de connexion.'
      );
    } finally {
      setChargement(false);
    }
  }, [email, motDePasse, onLogin, connecter]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* ─── Bannière Haute Bleu Royal ─── */}
        <View style={styles.topSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoCar}>🚗</Text>
          </View>
          <Text style={styles.brandTitle}>UniRide</Text>
          <Text style={styles.brandSub}>Plateforme ISET Nabeul</Text>
        </View>

        {/* ─── Carte Flottante Blanche ─── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Connexion</Text>

          {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}

          {/* Email */}
          <Text style={styles.inputLabel}>EMAIL UNIVERSITAIRE</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputIconText}>✉</Text>
            <TextInput
              style={styles.input}
              placeholder="votre.email@isetn.tn"
              placeholderTextColor={colors.textLight}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Mot de passe */}
          <View style={styles.pwdHeaderRow}>
            <Text style={styles.inputLabel}>MOT DE PASSE</Text>
            <TouchableOpacity onPress={() => alert('Veuillez contacter le support ISET.')}>
              <Text style={styles.forgotLink}>Oublié ?</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputIconText}>🔒</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.textLight}
              value={motDePasse}
              onChangeText={setMotDePasse}
              secureTextEntry
            />
          </View>

          {/* Bouton Connexion Bleu */}
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={seConnecter}
            disabled={chargement}
            activeOpacity={0.85}
          >
            {chargement ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.btnPrimaryText}>Se connecter</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ─── Pied de page ─── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Pas encore de compte ?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Inscrivez-vous maintenant</Text>
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
  topSection: {
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 45,
    paddingBottom: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    ...shadows.elevated,
  },
  logoCar: {
    fontSize: 32,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: -0.5,
  },
  brandSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    marginHorizontal: 20,
    marginTop: -20,
    padding: 24,
    ...shadows.elevated,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: radius.md,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  inputIconText: {
    fontSize: 16,
    color: colors.textMuted,
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.text,
  },
  pwdHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  forgotLink: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...shadows.card,
  },
  btnPrimaryText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 16,
  },
  erreur: {
    color: colors.danger,
    backgroundColor: colors.dangerLight,
    padding: 12,
    borderRadius: radius.md,
    marginBottom: 14,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  footerText: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 4,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
});
