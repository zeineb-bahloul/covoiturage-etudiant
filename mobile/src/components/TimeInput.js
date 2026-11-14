import React from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { colors, radius } from '../theme';
import { HEURE } from '../utils';

/** Pendant la saisie : « 0830 » → « 08:30 » (les deux points sont ajoutés tout seuls). */
export function formaterHeure(saisie) {
  const d = saisie.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d;
}

/** En quittant le champ : « 830 » → « 08:30 », « 8 » → « 08:00 ». */
export function completerHeure(valeur) {
  const d = (valeur || '').replace(/\D/g, '');
  if (d.length === 0) return '';
  if (d.length <= 2) return `${d.padStart(2, '0')}:00`;
  if (d.length === 3) return `0${d[0]}:${d.slice(1)}`;
  return `${d.slice(0, 2)}:${d.slice(2, 4)}`;
}

export default function TimeInput({ value, onChange, placeholder = '08:30', style }) {
  const invalide = value && value.length === 5 && !HEURE.test(value);
  return (
    <TextInput
      value={value}
      onChangeText={(t) => onChange(t.length < (value || '').length ? t.replace(/:$/, '') : formaterHeure(t))}
      onBlur={() => onChange(completerHeure(value))}
      placeholder={placeholder}
      placeholderTextColor={colors.faint}
      keyboardType="number-pad"
      maxLength={5}
      style={[styles.input, invalide && { borderColor: colors.danger }, style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.input,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.input,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
    minWidth: 74,
  },
});
