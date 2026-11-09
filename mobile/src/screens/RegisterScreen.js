import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import api from '../api';
import { colors, shadows, radius } from '../theme';

const FILIERES = [
  'Technologies de l’Informatique (TI)',
  'Génie Électrique (GE)',
  'Génie Mécanique (GM)',
  'Génie des Procédés (GP)',
  'Sciences Économiques & Gestion (SEG)',
];

export default function RegisterScreen({ navigation }) {
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [filiere, setFiliere] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [accepteConditions, setAccepteConditions] = useState(true);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [showFilieres, setShowFilieres] = useState(false);

  const sInscrire = useCallback(async () => {
    setErreur('');
    if (!nom.trim() || !email.trim() || !motDePasse) {
      setErreur('Nom, e-mail et mot de passe sont obligatoires');
      return;
    }
    if (!accepteConditions) {
      setErreur('Veuillez accepter les conditions d’utilisation');
      return;
    }

    setEnvoi(true);
    try {
      await api.post('/auth/register', {
        nom: nom.trim(),
        email: email.trim().toLowerCase(),
        motDePasse,
        filiere: filiere.trim() || 'ISET Nabeul',
      });
      Alert.alert(
        'Compte créé avec succès !',
        'Bienvenue sur UniRide. Vous pouvez dès à présent vous connecter.',
        [{ text: 'Se connecter', onPress: () => navigation.navigate('Login') }]
      );
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors de la création du compte');
    } finally {
      setEnvoi(false);
    }
  }, [nom, email, motDePasse, filiere, accepteConditions, navigation]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header simple avec flèche retour */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Créer un compte</Text>
        </View>

        <Text style={styles.subTitle}>
          Rejoignez la communauté de covoiturage de l'ISET Nabeul.
        </Text>

        {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}

        {/* Nom complet */}
        <Text style={styles.fieldLabel}>Nom complet</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.inputIcon}>👤</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Ahmed Ben Salem"
            placeholderTextColor={colors.textLight}
            value={nom}
            onChangeText={setNom}
          />
        </View>

        {/* Email universitaire */}
        <Text style={styles.fieldLabel}>Email Universitaire (@isetn.tn)</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.inputIcon}>✉</Text>
          <TextInput
            style={styles.input}
            placeholder="nom.prenom@isetn.tn"
            placeholderTextColor={colors.textLight}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
        <Text style={styles.helperText}>Uniquement les emails de l'institut sont acceptés.</Text>

        {/* Filière / Département */}
        <Text style={styles.fieldLabel}>Filière / Département</Text>
        <TouchableOpacity
          style={styles.inputContainer}
          onPress={() => setShowFilieres(!showFilieres)}
          activeOpacity={0.7}
        >
          <Text style={styles.inputIcon}>🏛</Text>
          <Text style={[styles.inputFake, !filiere && { color: colors.textLight }]}>
            {filiere || 'Sélectionnez votre filière'}
          </Text>
          <Text style={styles.chevronIcon}>⌄</Text>
        </TouchableOpacity>

        {showFilieres && (
          <View style={styles.dropdown}>
            {FILIERES.map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.dropdownItem, filiere === f && styles.dropdownItemActive]}
                onPress={() => { setFiliere(f); setShowFilieres(false); }}
              >
                <Text style={[styles.dropdownItemText, filiere === f && { color: colors.white }]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Mot de passe */}
        <Text style={styles.fieldLabel}>Mot de passe</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.inputIcon}>🔒</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.textLight}
            value={motDePasse}
            onChangeText={setMotDePasse}
            secureTextEntry
          />
        </View>

        {/* Conditions */}
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setAccepteConditions(!accepteConditions)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, accepteConditions && styles.checkboxActive]}>
            {accepteConditions && <Text style={styles.checkboxCheck}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            J'accepte les <Text style={styles.linkText}>Conditions d'Utilisation</Text> et la <Text style={styles.linkText}>Politique de Confidentialité</Text>.
          </Text>
        </TouchableOpacity>

        {/* Bouton S'inscrire */}
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={sInscrire}
          disabled={envoi}
          activeOpacity={0.85}
        >
          {envoi ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.btnPrimaryText}>S'inscrire</Text>
          )}
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Déjà inscrit ?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  backArrow: {
    fontSize: 28,
    color: colors.primary,
    fontWeight: '300',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  subTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: radius.md,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 10,
    color: colors.textMuted,
  },
  chevronIcon: {
    fontSize: 16,
    color: colors.textMuted,
    marginLeft: 6,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 14,
    color: colors.text,
  },
  inputFake: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 14,
    color: colors.text,
  },
  helperText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 4,
  },
  dropdown: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    marginTop: -8,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  dropdownItemActive: {
    backgroundColor: colors.primary,
  },
  dropdownItemText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: colors.card,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxCheck: {
    color: colors.white,
    fontSize: 13,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  linkText: {
    color: colors.primary,
    fontWeight: '700',
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
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 4,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
});
