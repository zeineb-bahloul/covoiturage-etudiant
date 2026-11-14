/**
 * Corrige l'erreur « querySrv ETIMEOUT / ECONNREFUSED _mongodb._tcp... » :
 * certains réseaux (box, wifi de l'ISET, Windows + Node 22) ne savent pas résoudre
 * les enregistrements SRV utilisés par les adresses mongodb+srv:// d'Atlas.
 * On force Node à utiliser des DNS publics (modifiable avec DNS_SERVERS dans .env).
 */
const dns = require('dns');

const serveurs = (process.env.DNS_SERVERS || '8.8.8.8,1.1.1.1')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

try {
  dns.setServers(serveurs);
} catch (err) {
  console.warn('DNS_SERVERS invalide, DNS du système conservé :', err.message);
}
