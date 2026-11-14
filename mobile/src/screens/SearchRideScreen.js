import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import api from '../api';
import AddressPicker from '../components/AddressPicker';
import { Button, Card, Chip, Field, Header, Input, Row, Screen, Toggle } from '../components/ui';
import { colors, font, spacing } from '../theme';
import { HEURE, dateISO } from '../utils';

function prochainsJours() {
  const noms = ["Aujourd'hui", 'Demain'];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      valeur: dateISO(d),
      label: noms[i] || d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
    };
  });
}

const CRENEAUX = ['', '07:00', '08:00', '09:00', '10:00', '12:00', '14:00'];

/** Recherche de trajet avec filtres (US7). Utilisé comme onglet « Rechercher ». */
export default function SearchRideScreen({ navigation }) {
  const [lieu, setLieu] = useState(null);
  const [domicile, setDomicile] = useState(null);
  const [date, setDate] = useState(dateISO());
  const [heure, setHeure] = useState('08:00');
  const [prixMax, setPrixMax] = useState('');
  const [noteMin, setNoteMin] = useState(0);
  const [nonFumeur, setNonFumeur] = useState(false);
  const [mixte, setMixte] = useState(false);
  const [filtres, setFiltres] = useState(false);
  const [erreur, setErreur] = useState('');
  const jours = prochainsJours();

  useEffect(() => {
    api
      .get('/auth/me')
      .then(({ data }) => {
        if (data.domicile) {
          const [lng, lat] = data.domicile.location.coordinates;
          const d = { label: data.domicile.label, lat, lng, titre: 'Mon domicile', icone: 'home-outline' };
          setDomicile(d);
          setLieu((l) => l || d);
        }
      })
      .catch(() => {});
  }, []);

  const rechercher = () => {
    setErreur('');
    if (!lieu) {
      setErreur('Indiquez votre point de départ.');
      return;
    }
    if (heure && !HEURE.test(heure)) {
      setErreur("Heure au format HH:MM (ex : 07:30) ou choisissez « Toute la journée ».");
      return;
    }
    navigation.navigate('RideResults', {
      lat: lieu.lat,
      lng: lieu.lng,
      label: lieu.label,
      date,
      heure: heure || undefined,
      prixMax: prixMax ? prixMax.replace(',', '.') : undefined,
      noteMin: noteMin || undefined,
      nonFumeur: nonFumeur || undefined,
      mixte: mixte || undefined,
    });
  };

  return (
    <Screen
      header={<Header title="Trouver un trajet" subtitle="Vers l'ISET Nabeul ou ailleurs" />}
      footer={<Button title="Rechercher" icon="search" onPress={rechercher} />}
      keyboard
      bottomInset={false}
    >
      <Card>
        <AddressPicker
          label="Point de départ"
          valeur={lieu}
          onChoisir={setLieu}
          placeholder="Votre ville ou quartier"
          raccourcis={domicile ? [domicile] : []}
        />
        <Field label="Jour" style={{ marginBottom: spacing.md }}>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {jours.map((j) => (
              <Chip key={j.valeur} label={j.label} selected={date === j.valeur} onPress={() => setDate(j.valeur)} />
            ))}
          </Row>
        </Field>
        <Field label="Heure de départ souhaitée" hint="Trajets partant à ±1 h 30 de cette heure" style={{ marginBottom: 0 }}>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {CRENEAUX.map((c) => (
              <Chip key={c || 'tous'} label={c || 'Toute la journée'} selected={heure === c} onPress={() => setHeure(c)} />
            ))}
          </Row>
        </Field>
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={font.h3}>Filtres</Text>
          <Text style={{ color: colors.primary, fontWeight: '700' }} onPress={() => setFiltres(!filtres)}>
            {filtres ? 'Masquer' : 'Afficher'}
          </Text>
        </Row>
        {filtres ? (
          <View style={{ marginTop: spacing.lg }}>
            <Input label="Prix maximum (DT)" icon="cash-outline" placeholder="Ex : 5" value={prixMax} onChangeText={setPrixMax} keyboardType="decimal-pad" />
            <Field label="Note minimale du conducteur">
              <Row gap={8}>
                {[0, 3, 4, 4.5].map((n) => (
                  <Chip key={n} label={n === 0 ? 'Toutes' : `${String(n).replace('.', ',')} ★ +`} selected={noteMin === n} onPress={() => setNoteMin(n)} />
                ))}
              </Row>
            </Field>
            <Toggle icon="ban-outline" label="Non-fumeur uniquement" value={nonFumeur} onChange={setNonFumeur} />
            <Toggle icon="people-outline" label="Trajets mixtes uniquement" value={mixte} onChange={setMixte} />
          </View>
        ) : null}
      </Card>

      {erreur ? <Text style={{ color: colors.danger, textAlign: 'center' }}>{erreur}</Text> : null}
    </Screen>
  );
}
