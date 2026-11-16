# UniRide — tests et déploiement (sprint 6)

## 1. Lancer les tests automatisés (backend)

```bash
cd backend
npm install
npm test
```

28 tests couvrent les sprints 1 à 6 : comptes, emploi du temps, publication, matching, réservation,
rappels, chat Socket.io, avis, statistiques, SOS et administration.
Ils utilisent une base MongoDB **en mémoire** : vos données Atlas ne sont jamais touchées.
(Au premier lancement, `mongodb-memory-server` télécharge MongoDB, environ 100 Mo.)

## 2. Tester l'API avec Postman

1. `npm run seed` puis `npm run dev`
2. Postman → **Import** → `backend/docs/UniRide.postman_collection.json`
3. Lancer d'abord le dossier **0. Connexion** (les jetons sont enregistrés automatiquement),
   puis **Run collection** : 43 requêtes, 43 vérifications.

## 3. Déployer le backend sur Render (gratuit)

1. **MongoDB Atlas** → *Network Access* → *Add IP Address* → `0.0.0.0/0`
   (Render n'a pas d'adresse IP fixe).
2. Pousser le projet sur GitHub (`git push`).
3. [render.com](https://render.com) → **New → Blueprint** → choisir le dépôt.
   Le fichier `render.yaml` configure tout automatiquement.
4. Renseigner les deux secrets demandés : `MONGO_URI` et `ORS_API_KEY`
   (`JWT_SECRET` est généré automatiquement).
5. Vérifier : `https://uniride-api.onrender.com/api/health` doit répondre `{"ok":true,...}`.

> L'offre gratuite met le serveur en veille après 15 min d'inactivité : la première requête
> prend environ 50 secondes. Ouvrez l'URL `/api/health` quelques minutes avant la démo.

## 4. Brancher l'application sur le serveur en ligne

Créer `mobile/.env` :

```
EXPO_PUBLIC_API_URL=https://uniride-api.onrender.com
```

puis relancer `npx expo start -c`. Sans ce fichier, l'application utilise l'adresse IP locale
définie dans `mobile/src/api.js`.

## 5. Générer l'APK Android (pour la démo)

```bash
npm install -g eas-cli
cd mobile
eas login
eas build -p android --profile preview
```

Le lien de téléchargement de l'APK s'affiche à la fin (environ 15 min). L'URL du serveur est déjà
définie dans `eas.json` (à modifier si votre service Render porte un autre nom).

## Comptes de démonstration (`npm run seed`, mot de passe `demo123`)

| Compte | Rôle |
|---|---|
| sara@isetn.tn | passagère |
| karim@isetn.tn | conducteur |
| linda@isetn.tn | conductrice, trajet en cours |
| amira@isetn.tn | passagère du trajet en cours, alerte SOS |
| youssef@isetn.tn | conducteur signalé |
| omar@isetn.tn | passager |
| bilel@isetn.tn | compte bloqué |
| admin@isetn.tn | administrateur |
