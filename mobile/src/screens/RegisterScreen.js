import React, { useState } from 'react';
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
import { colors, shadows } from '../theme';

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

  const sInscrire = async () => {
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
        'Compte créé avec succès ! 🎉',
        'Bienvenue sur UniRide. Vous pouvez dès à présent vous connecter.',
        [{ text: 'Se connecter', onPress: () => navigation.navigate('Login') }]
      );
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors de la création du compte');
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Bouton Retour en haut */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnArrow}>←</Text>
        </TouchableOpacity>

        <Text style={styles.titre}>Nous rejoindre</Text>
        <Text style={styles.sousTitre}>
          Créez votre compte UniRide pour un campus plus vert et connecté.
        </Text>

        {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}

        <Text style={styles.label}>NOM COMPLET</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex : Ahmed Ben Salem"
          placeholderTextColor={colors.textLight}
          value={nom}
          onChangeText={setNom}
        />

        <Text style={styles.label}>EMAIL UNIVERSITAIRE</Text>
        <TextInput
          style={styles.input}
          placeholder="nom.prenom@isetn.tn"
          placeholderTextColor={colors.textLight}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Text style={styles.aideDomain}>Domaine universitaire @isetn.tn recommandé</Text>

        <Text style={styles.label}>FILIÈRE / DÉPARTEMENT</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex : DSI / TI / Génie Électrique"
          placeholderTextColor={colors.textLight}
          value={filiere}
          onChangeText={setFiliere}
        />

        <Text style={styles.label}>MOT DE PASSE</Text>
        <TextInput
          style={styles.input}
          placeholder="6 caractères minimum"
          placeholderTextColor={colors.textLight}
          value={motDePasse}
          onChangeText={setMotDePasse}
          secureTextEntry
        />

        {/* Checkbox Conditions d'utilisation */}
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setAccepteConditions(!accepteConditions)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, accepteConditions && styles.checkboxActive]}>
            {accepteConditions && <Text style={styles.checkboxCheck}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            J'accepte les <Text style={{ fontWeight: 'bold' }}>Conditions d'Utilisation</Text> & la politique de
            confidentialité du campus.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bouton}
          onPress={sInscrire}
          disabled={envoi}
          activeOpacity={0.85}
        >
          {envoi ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.boutonTexte}>Créer mon compte</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footerLinkRow}>
          <Text style={styles.footerTexte}>Déjà un compte ? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLien}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 40,
    backgroundColor: colors.background,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtnArrow: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: 'bold',
  },
  titre: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
  },
  sousTitre: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
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
    marginBottom: 12,
  },
  aideDomain: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    marginTop: -8,
    marginBottom: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
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
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  bouton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
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
    marginTop: 24,
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
