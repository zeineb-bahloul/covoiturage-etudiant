import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  titre: { fontSize: 26, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 12 },
  bouton: { backgroundColor: '#2563eb', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  boutonTexte: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  lien: { color: '#2563eb', textAlign: 'center', marginTop: 16 },
  erreur: { color: '#dc2626', marginBottom: 12, textAlign: 'center' },
});