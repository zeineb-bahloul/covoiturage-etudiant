import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import api from '../api';
import { colors, font, radius, spacing } from '../theme';
import { Ionicons } from './ui';
import { court } from '../utils';

/**
 * Recherche d'adresse (géocodage OpenRouteService via le backend).
 * La recherche se lance automatiquement pendant la saisie.
 */
export default function AddressPicker({ label, valeur, onChoisir, placeholder = 'Ville, quartier, lieu…', icon = 'location-outline', raccourcis = [] }) {
  const [texte, setTexte] = useState('');
  const [resultats, setResultats] = useState([]);
  const [recherche, setRecherche] = useState(false);
  const [message, setMessage] = useState('');
  const minuteur = useRef(null);
  const derniere = useRef(0);

  useEffect(() => {
    clearTimeout(minuteur.current);
    const q = texte.trim();
    if (q.length < 3) {
      setResultats([]);
      setMessage('');
      return undefined;
    }
    minuteur.current = setTimeout(async () => {
      const id = ++derniere.current;
      setRecherche(true);
      setMessage('');
      try {
        const { data } = await api.get('/map/geocode', { params: { text: q } });
        if (id !== derniere.current) return;
        setResultats(data);
        if (data.length === 0) setMessage('Aucun lieu trouvé en Tunisie');
      } catch (err) {
        if (id === derniere.current) setMessage(err.response?.data?.message || 'Service de cartes indisponible');
      } finally {
        if (id === derniere.current) setRecherche(false);
      }
    }, 450);
    return () => clearTimeout(minuteur.current);
  }, [texte]);

  const choisir = (lieu) => {
    onChoisir(lieu);
    setTexte('');
    setResultats([]);
  };

  return (
    <View style={{ marginBottom: spacing.lg }}>
      {label ? <Text style={[font.label, { marginBottom: 6 }]}>{label}</Text> : null}

      {valeur ? (
        <View style={styles.selection}>
          <Ionicons name="location" size={20} color={colors.primary} />
          <View style={{ flex: 1, marginHorizontal: 10 }}>
            <Text style={styles.selectionTitre} numberOfLines={1}>
              {court(valeur.label)}
            </Text>
            <Text style={font.caption} numberOfLines={1}>
              {valeur.label}
            </Text>
          </View>
          <Pressable onPress={() => onChoisir(null)} hitSlop={8} style={styles.changer}>
            <Text style={styles.changerTexte}>Changer</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.inputBox}>
            <Ionicons name={icon} size={19} color={colors.faint} style={{ marginRight: 10 }} />
            <TextInput
              style={styles.input}
              value={texte}
              onChangeText={setTexte}
              placeholder={placeholder}
              placeholderTextColor={colors.faint}
              autoCorrect={false}
              returnKeyType="search"
            />
            {recherche ? <ActivityIndicator size="small" color={colors.primary} /> : null}
          </View>

          {raccourcis.length > 0 && texte.length === 0 ? (
            <View style={styles.raccourcis}>
              {raccourcis.map((r) => (
                <Pressable key={r.label} onPress={() => choisir(r)} style={styles.raccourci}>
                  <Ionicons name={r.icone || 'star-outline'} size={14} color={colors.primary} />
                  <Text style={styles.raccourciTexte} numberOfLines={1}>
                    {r.titre || court(r.label)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {message ? <Text style={styles.message}>{message}</Text> : null}

          {resultats.length > 0 ? (
            <View style={styles.liste}>
              {resultats.map((lieu, i) => (
                <Pressable
                  key={`${lieu.lat}-${lieu.lng}-${i}`}
                  onPress={() => choisir(lieu)}
                  style={({ pressed }) => [styles.item, i > 0 && styles.itemBordure, pressed && { backgroundColor: colors.input }]}
                >
                  <Ionicons name="location-outline" size={18} color={colors.muted} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.itemTitre} numberOfLines={1}>
                      {court(lieu.label)}
                    </Text>
                    <Text style={font.caption} numberOfLines={1}>
                      {lieu.label}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.input,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.ink },
  selection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  selectionTitre: { fontSize: 15, fontWeight: '700', color: colors.ink },
  changer: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm, backgroundColor: colors.card },
  changerTexte: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  message: { color: colors.muted, fontSize: 13, marginTop: 6 },
  liste: {
    marginTop: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 12 },
  itemBordure: { borderTopWidth: 1, borderTopColor: colors.borderSoft },
  itemTitre: { fontSize: 14, fontWeight: '600', color: colors.ink },
  raccourcis: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  raccourci: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    maxWidth: '100%',
  },
  raccourciTexte: { color: colors.primary, fontWeight: '600', fontSize: 13 },
});
