import React, { useState } from 'react';
import api from '../api';
import AuthLayout from '../components/AuthLayout';
import { Button, Input, Notice } from '../components/ui';
import { erreurApi } from '../utils';

export default function ForgotPasswordScreen({ navigation, route }) {
  const [etape, setEtape] = useState(1);
  const [email, setEmail] = useState(route.params?.email || '');
  const [code, setCode] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [info, setInfo] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const demanderCode = async () => {
    setErreur('');
    if (!email.trim()) {
      setErreur('Indiquez votre e-mail.');
      return;
    }
    setEnvoi(true);
    try {
      const { data } = await api.post('/auth/forgot', { email: email.trim().toLowerCase() });
      // En mode démonstration, le serveur renvoie le code (pas de service d'e-mail gratuit)
      setInfo(data.codeDemo ? `${data.message}\n\nMode démo — votre code : ${data.codeDemo}` : data.message);
      setEtape(2);
    } catch (err) {
      setErreur(erreurApi(err));
    } finally {
      setEnvoi(false);
    }
  };

  const reinitialiser = async () => {
    setErreur('');
    if (code.trim().length !== 6) {
      setErreur('Le code contient 6 chiffres.');
      return;
    }
    if (motDePasse.length < 6) {
      setErreur('Nouveau mot de passe : 6 caractères minimum.');
      return;
    }
    setEnvoi(true);
    try {
      const { data } = await api.post('/auth/reset', { email: email.trim().toLowerCase(), code: code.trim(), motDePasse });
      navigation.popTo('Login', { email: email.trim().toLowerCase(), message: data.message });
    } catch (err) {
      setErreur(erreurApi(err));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <AuthLayout
      titre="Mot de passe oublié"
      sousTitre={etape === 1 ? 'Recevez un code pour choisir un nouveau mot de passe.' : 'Saisissez le code reçu et votre nouveau mot de passe.'}
      onBack={() => (etape === 2 ? setEtape(1) : navigation.goBack())}
    >
      {erreur ? <Notice tone="danger" icon="alert-circle-outline" text={erreur} /> : null}
      {etape === 1 ? (
        <>
          <Input
            label="E-mail du compte"
            icon="mail-outline"
            placeholder="prenom.nom@isetn.tn"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Button title="Recevoir un code" onPress={demanderCode} loading={envoi} />
        </>
      ) : (
        <>
          {info ? <Notice tone="info" text={info} /> : null}
          <Input label="Code à 6 chiffres" icon="keypad-outline" placeholder="123456" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
          <Input label="Nouveau mot de passe" icon="lock-closed-outline" placeholder="6 caractères minimum" value={motDePasse} onChangeText={setMotDePasse} secure />
          <Button title="Changer le mot de passe" onPress={reinitialiser} loading={envoi} />
        </>
      )}
    </AuthLayout>
  );
}
