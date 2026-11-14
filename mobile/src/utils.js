// Petites fonctions de mise en forme partagées par les écrans.
export const JOURS = [
  { cle: 'lundi', court: 'Lun', lettre: 'L', label: 'Lundi' },
  { cle: 'mardi', court: 'Mar', lettre: 'M', label: 'Mardi' },
  { cle: 'mercredi', court: 'Mer', lettre: 'M', label: 'Mercredi' },
  { cle: 'jeudi', court: 'Jeu', lettre: 'J', label: 'Jeudi' },
  { cle: 'vendredi', court: 'Ven', lettre: 'V', label: 'Vendredi' },
  { cle: 'samedi', court: 'Sam', lettre: 'S', label: 'Samedi' },
];

export const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Première partie d'une adresse ORS : « Ariana, Tunisie » → « Ariana ». */
export const court = (label) => (label || '').split(',')[0].trim();

export const prenom = (nom) => (nom || '').trim().split(/\s+/)[0] || '';

export const prix = (n) => `${Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} DT`;

export const nombre = (n, dec = 1) => Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: dec });

/** Date locale AAAA-MM-JJ (évite le décalage UTC de toISOString). */
export function dateISO(d = new Date()) {
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function dateLisible(valeur) {
  if (!valeur) return '';
  const d = typeof valeur === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valeur) ? new Date(`${valeur}T12:00:00`) : new Date(valeur);
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** « Lun, Mar, Jeu » ou « mardi 18 novembre ». */
export function quand(trajet) {
  if (!trajet) return '';
  if (trajet.recurrent) {
    const jours = JOURS.filter((j) => (trajet.jours || []).includes(j.cle)).map((j) => j.court);
    return jours.length === 6 ? 'Du lundi au samedi' : `Chaque ${jours.join(', ')}`;
  }
  return dateLisible(trajet.date);
}

export function heureMessage(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function tempsRelatif(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 1) return "À l'instant";
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `Il y a ${h} h`;
  const j = Math.round(h / 24);
  if (j === 1) return 'Hier';
  if (j < 7) return `Il y a ${j} jours`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export const erreurApi = (err, defaut = 'Impossible de joindre le serveur') =>
  err?.response?.data?.message || (err?.code === 'ECONNABORTED' ? 'Le serveur met trop de temps à répondre' : defaut);

export const MUSIQUE = { calme: 'Musique calme', animee: 'Musique animée', aucune: 'Pas de préférence musicale' };
