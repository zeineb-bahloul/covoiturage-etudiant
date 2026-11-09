import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import api from '../api';
import { colors } from '../theme';

export default function AddressPicker({ titre, valeur, onChoisir, placeholder = 'Ex : Nabeul Centre, Hammamet...' }) {
  const [texte, setTexte] = useState('');
  const [resultats, setResultats] = useState([]);
  const [recherche, setRecherche] = useState(false);
  const [message, setMessage] = useState('');

  const chercher = async () => {
    setMessage('');
    if (texte.trim().length < 3) {
      setMessage('Écrivez au moins 3 caractères');
      return;
    }
    setRecherche(true);
    try {
      const { data } = await api.get('/map/geocode', { params: { text: texte.trim() } });
      setResultats(data);
      if (data.length === 0) setMessage('Aucun lieu trouvé');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Impossible de joindre le service de carte');
    } finally {
      setRecherche(false);
    }
  };

  const choisir = (lieu) => {
    onChoisir(lieu);
    setResultats([]);
    setTexte('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titre}>{titre}</Text>

      {valeur ? (
        <View style={styles.valeurCard}>
          <View style={styles.valeurInfo}>
            <View style={styles.pinIndicator} />
            <Text style={styles.valeurTexte} numberOfLines={2}>
              {valeur.label}
            </Text>
          </View>
          <TouchableOpacity onPress={() => onChoisir(null)} style={styles.modifierBouton}>
            <Text style={styles.modifierTexte}>Modifier</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={texte}
              onChangeText={setTexte}
              placeholder={placeholder}
              placeholderTextColor={colors.textLight}
              onSubmitEditing={chercher}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={chercher}
              disabled={recherche}
              activeOpacity={0.8}
            >
              {recherche ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.searchButtonText}>Trouver</Text>
              )}
            </TouchableOpacity>
          </View>

          {message ? <Text style={styles.erreur}>{message}</Text> : null}

          {resultats.length > 0 && (
            <View style={styles.resultsContainer}>
              {resultats.map((lieu, i) => (
                <TouchableOpacity
                  key={`${lieu.lat}-${lieu.lng}-${i}`}
                  onPress={() => choisir(lieu)}
                  style={styles.resultItem}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resultPin}>📍</Text>
                  <Text style={styles.resultText} numberOfLines={2}>
                    {lieu.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
  },
  titre: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  valeurCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  valeurInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  pinIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginRight: 10,
  },
  valeurTexte: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 14,
    flex: 1,
  },
  modifierBouton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  modifierTexte: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    marginRight: 8,
  },
  searchButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  erreur: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 6,
  },
  resultsContainer: {
    backgroundColor: colors.card,
    borderRadius: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  resultPin: {
    fontSize: 16,
    marginRight: 10,
  },
  resultText: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
});
