const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const PAR_ABREVIATION = { lun: 'lundi', mar: 'mardi', mer: 'mercredi', jeu: 'jeudi', ven: 'vendredi', sam: 'samedi' };
const PAR_CODE_ICS = { MO: 'lundi', TU: 'mardi', WE: 'mercredi', TH: 'jeudi', FR: 'vendredi', SA: 'samedi' };

function normaliser(texte) {
  return texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function jourDepuisTexte(texte) {
  return PAR_ABREVIATION[normaliser(texte).slice(0, 3)] || null;
}

function heureDepuisTexte(texte) {
  const m = texte.trim().match(/^(\d{1,2})\s*[:hH]\s*(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
}

function lireCSV(texte) {
  const evenements = [];
  let ignorees = 0;
  const lignes = texte.replace(/^\uFEFF/, '').split(/\r?\n/);

  for (const ligne of lignes) {
    if (ligne.trim() === '') continue;
    const sep = ligne.includes(';') ? ';' : ',';
    const [cJour, cDebut, cFin] = ligne.split(sep).map((c) => c.trim());

    if (normaliser(cJour || '') === 'jour') continue;

    const jour = jourDepuisTexte(cJour || '');
    const debut = heureDepuisTexte(cDebut || '');
    const fin = heureDepuisTexte(cFin || '');

    if (jour && debut && fin && debut < fin) {
      evenements.push({ jour, debut, fin });
    } else {
      ignorees += 1;
    }
  }
  return { evenements, ignorees };
}

function lireDateICS(ligne) {
  const valeur = ligne.slice(ligne.lastIndexOf(':') + 1).trim();
  const m = valeur.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!m) return null;

  const [, an, mois, jour, h, mi, , zulu] = m;

  if (zulu) {
    const date = new Date(Date.UTC(+an, +mois - 1, +jour, +h, +mi));
    const parties = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Tunis',
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(date);
    const get = (type) => parties.find((p) => p.type === type).value;
    const y = +get('year');
    const mo = +get('month');
    const d = +get('day');
    return {
      cle: `${y}-${mo}-${d}`,
      jourSemaine: new Date(Date.UTC(y, mo - 1, d)).getUTCDay(),
      heure: `${get('hour')}:${get('minute')}`,
    };
  }

  return {
    cle: `${+an}-${+mois}-${+jour}`,
    jourSemaine: new Date(Date.UTC(+an, +mois - 1, +jour)).getUTCDay(),
    heure: `${h}:${mi}`,
  };
}

function lireICS(texte) {
  const evenements = [];
  let ignorees = 0;
  const lignes = texte.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);

  let courant = null;
  for (const ligne of lignes) {
    if (ligne.startsWith('BEGIN:VEVENT')) {
      courant = {};
    } else if (ligne.startsWith('END:VEVENT')) {
      if (courant) {
        const debut = courant.dtstart ? lireDateICS(courant.dtstart) : null;
        const fin = courant.dtend ? lireDateICS(courant.dtend) : null;

        if (!debut || !fin || debut.cle !== fin.cle || debut.heure >= fin.heure) {
          ignorees += 1;
        } else {
          let jours = [JOURS[debut.jourSemaine]];
          const byday = courant.rrule && courant.rrule.match(/BYDAY=([^;]+)/);
          if (byday) {
            jours = byday[1].split(',').map((c) => PAR_CODE_ICS[c.replace(/[^A-Z]/g, '')]).filter(Boolean);
          }
          jours = jours.filter((j) => j !== 'dimanche');
          if (jours.length === 0) ignorees += 1;
          jours.forEach((jour) => evenements.push({ jour, debut: debut.heure, fin: fin.heure }));
        }
      }
      courant = null;
    } else if (courant) {
      if (ligne.startsWith('DTSTART')) courant.dtstart = ligne;
      else if (ligne.startsWith('DTEND')) courant.dtend = ligne;
      else if (ligne.startsWith('RRULE')) courant.rrule = ligne;
    }
  }
  return { evenements, ignorees };
}

function lireEmploiDuTemps(contenu) {
  const format = contenu.includes('BEGIN:VCALENDAR') ? 'ics' : 'csv';
  const { evenements, ignorees } = format === 'ics' ? lireICS(contenu) : lireCSV(contenu);

  if (evenements.length === 0) {
    throw new Error(
      format === 'ics'
        ? "Aucun cours exploitable dans ce fichier ICS"
        : 'Aucune ligne valide. Format attendu : jour;debut;fin (ex : lundi;08:30;16:00)'
    );
  }

  const parJour = {};
  for (const e of evenements) {
    if (!parJour[e.jour]) {
      parJour[e.jour] = { jour: e.jour, debut: e.debut, fin: e.fin };
    } else {
      if (e.debut < parJour[e.jour].debut) parJour[e.jour].debut = e.debut;
      if (e.fin > parJour[e.jour].fin) parJour[e.jour].fin = e.fin;
    }
  }

  const ordre = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const jours = ordre.filter((j) => parJour[j]).map((j) => parJour[j]);

  return { jours, ignorees, format };
}

module.exports = { lireEmploiDuTemps };

