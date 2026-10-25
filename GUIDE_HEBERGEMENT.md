# Guide : hébergement de « Gestion de boutique » sur Render (gratuit)

Résultat : un lien `https://gestion-boutique-xxxx.onrender.com` à donner au jury, et un lien GitHub pour le code.
Ce guide utilise la méthode **manuelle** (pas de Blueprint) : chaque réglage est visible, donc facile à corriger.

> Pense à garder 3 choses sous la main : ton compte **GitHub**, ton compte **Render** (connexion avec GitHub possible), et le mot de passe que tu choisiras pour l'administrateur.

---

## Partie 1 : Mettre le code sur GitHub

1. Va sur https://github.com/new
   - Repository name : `gestion-boutique`
   - Public
   - **Ne coche rien** (ni README, ni .gitignore, ni licence)
   - Clique sur **Create repository**
2. Ouvre le dossier du projet dans VS Code (le dossier qui contient `backend`, `frontend`, `README.md`, `render.yaml`). Ouvre le terminal **dans ce dossier** et tape (remplace `TONNOM` par ton nom d'utilisateur GitHub) :

```
git init
git add .
git commit -m "Gestion de boutique"
git branch -M main
git remote add origin https://github.com/TONNOM/gestion-boutique.git
git push -u origin main
```

   Si Git te demande de t'identifier : une fenêtre GitHub s'ouvre, connecte-toi.
   Si `git` n'est pas reconnu : installe Git (https://git-scm.com/download/win) puis redémarre VS Code.

3. **Vérification importante** : rafraîchis la page du dépôt sur GitHub. Tu dois voir **directement** à la racine : `backend`, `frontend`, `README.md`, `render.yaml`, `.gitignore`.
   Si tu vois un seul dossier (par ex. `gestion-boutique (3)`), c'est que tu as ouvert le mauvais niveau : dans ce cas, plus loin, mets **Root Directory** = `gestion-boutique (3)/backend`.
   Dans `backend`, le dossier **`frontend_dist`** doit exister (c'est le site React déjà compilé). Le dossier `venv` ne doit **pas** être présent.

**Ton lien GitHub** : `https://github.com/TONNOM/gestion-boutique`

---

## Partie 2 : Créer la base de données (PostgreSQL) sur Render

1. Va sur https://dashboard.render.com et connecte-toi.
2. **New +** → **PostgreSQL**.
3. Remplis :
   - Name : `gestion-boutique-db`
   - Region : choisis une région (par ex. **Frankfurt (EU Central)**) et **note-la** : le site web devra être dans la **même région**
   - Instance Type / Plan : **Free**
   - Le reste : laisse par défaut
4. **Create Database**, puis attends que le statut devienne **Available** (1 à 2 minutes).
5. Sur la page de la base, dans la partie **Connections**, copie **Internal Database URL** (bouton de copie à droite). Garde-la dans un bloc-notes.

---

## Partie 3 : Créer le site web sur Render

1. **New +** → **Web Service** → **Build and deploy from a Git repository** → **Next**.
2. Connecte GitHub si on te le demande, puis choisis le dépôt `gestion-boutique` → **Connect**.
3. Remplis exactement :

| Champ | Valeur |
|---|---|
| Name | `gestion-boutique` |
| Region | **la même que la base de données** |
| Branch | `main` |
| Root Directory | `backend` |
| Runtime / Language | `Python 3` |
| Build Command | `pip install -r requirements.txt && python manage.py collectstatic --noinput` |
| Start Command | `python manage.py migrate --noinput && python manage.py seed && gunicorn config.wsgi:application` |
| Instance Type | **Free** |

4. Descends jusqu'à **Environment Variables** et ajoute 4 variables (**Add Environment Variable**) :

| Key | Value |
|---|---|
| `PYTHON_VERSION` | `3.12.8` |
| `DATABASE_URL` | colle ici l'**Internal Database URL** copiée à la partie 2 |
| `SECRET_KEY` | une longue suite de lettres/chiffres au hasard (30 caractères ou plus) |
| `ADMIN_PASSWORD` | le mot de passe que tu veux pour le compte `admin` |

   (`PYTHON_VERSION` est obligatoire : Render utilise Python 3.14 par défaut et ce projet est testé avec 3.12.)

5. Clique sur **Create Web Service**. Render lance la construction. Ouvre l'onglet **Logs** pour suivre. Compte 5 à 10 minutes.
   Quand tu vois `Your service is live`, c'est terminé.

---

## Partie 4 : Vérifier

1. Le lien du site est affiché en haut de la page du service : `https://gestion-boutique-xxxx.onrender.com`.
2. Ouvre **`ton-lien/api/sante/`** : tu dois voir `{"ok":true,"base":"postgresql"}`.
   - `"base":"postgresql"` : parfait.
   - `"base":"sqlite"` : la variable `DATABASE_URL` est absente ou mal écrite (les données seraient perdues à chaque redémarrage).
3. Ouvre `ton-lien` : page de connexion. Identifiants : **`admin`** et le mot de passe `ADMIN_PASSWORD`.

**Ton lien d'hébergement** = le lien du site Render.

---

## Si ça ne marche pas

Ouvre l'onglet **Logs** du service sur Render, copie les dernières lignes rouges et envoie-les.

| Problème | Cause probable | Solution |
|---|---|---|
| Build : `Root directory ... does not exist` / `requirements.txt not found` | Mauvais Root Directory | Regarde la racine de ton dépôt GitHub ; mets `backend` ou `nom-du-dossier/backend` |
| Build : erreur de version Python | `PYTHON_VERSION` mal écrit | Doit être `3.12.8` (3 nombres) |
| `DisallowedHost` ou erreur 400 | Mauvais domaine | Le site doit être en `*.onrender.com` ; sinon ajoute le domaine dans `ALLOWED_HOSTS` |
| `could not translate host name` / `connection refused` (base) | Mauvaise URL ou région différente | Utilise l'**Internal** Database URL et mets le site et la base dans la **même région** |
| Page « Application React non compilée » | `backend/frontend_dist` absent de GitHub | Vérifie qu'il est bien dans le dépôt, puis `git add . && git commit -m fix && git push` |
| Connexion refusée (mot de passe incorrect) | Mauvais `ADMIN_PASSWORD` | Modifie la variable sur Render (Environment) → le site redémarre et le mot de passe est mis à jour |
| Le site est lent au premier chargement | Plan gratuit en veille | Normal : attends environ 1 minute |

## À savoir

- Le site gratuit s'endort après 15 minutes sans visite. Ouvre le lien quelques minutes avant la soutenance.
- La base PostgreSQL gratuite **expire 30 jours** après sa création (14 jours de grâce avant suppression). Crée-la peu avant la soutenance.
- Après toute modification du code : `git add .`, `git commit -m "message"`, `git push` : Render redéploie automatiquement.
- Si tu modifies le dossier `frontend`, recompile avant de pousser : `cd frontend`, `npm.cmd run build` (le résultat va dans `backend/frontend_dist`).
