import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { erreurApi } from './utils';

/**
 * Charge des données à chaque fois que l'écran redevient visible.
 * Premier chargement : écran de chargement ; ensuite : mise à jour silencieuse.
 */
export function useDonnees(charger, deps = []) {
  const [data, setData] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [erreur, setErreur] = useState('');
  const dejaCharge = useRef(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const executer = useCallback(charger, deps);

  const recharger = useCallback(async () => {
    try {
      const resultat = await executer();
      setData(resultat);
      setErreur('');
      dejaCharge.current = true;
    } catch (err) {
      if (!dejaCharge.current) setErreur(erreurApi(err, 'Chargement impossible. Vérifiez votre connexion.'));
    } finally {
      setChargement(false);
      setRafraichissement(false);
    }
  }, [executer]);

  useFocusEffect(
    useCallback(() => {
      recharger();
    }, [recharger])
  );

  const rafraichir = useCallback(() => {
    setRafraichissement(true);
    recharger();
  }, [recharger]);

  const reessayer = useCallback(() => {
    setChargement(true);
    setErreur('');
    recharger();
  }, [recharger]);

  return { data, setData, chargement, erreur, rafraichissement, rafraichir, recharger, reessayer };
}
