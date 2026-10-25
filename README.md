# Gestion d'une boutique

Application web de gestion de boutique.

- **Backend** : Django 6 + Django REST Framework (API REST)
- **Frontend** : React 18 + Vite + React Router
- **Base de données** : SQLite (fichier `backend/db.sqlite3`, déjà fournie avec des données de démonstration)

## Fonctionnalités

| Module | Ce que l'on peut faire |
|---|---|
| Connexion | Page de connexion par mot de passe ; toute l'API est protégée par un jeton (token) |
| Tableau de bord | Chiffre d'affaires, ventes du jour, valeur du stock, produits en alerte, meilleures ventes |
| Produits | Ajouter, modifier, supprimer, rechercher ; alerte quand le stock ≤ seuil |
| Catégories | Ajouter, modifier, supprimer ; nombre de produits par catégorie |
| Clients | Ajouter, modifier, supprimer (nom, téléphone, adresse) |
| Ventes | Enregistrer une vente (plusieurs produits, client facultatif), historique, détail, **facture PDF**, **annulation** (remise en stock) |
| Rapports | Rapport entre deux dates : chiffre d'affaires, bénéfice, articles vendus, ventes par jour, produits les plus vendus, impression |

Règles de gestion :
- Une vente **diminue automatiquement le stock** ; si le stock est insuffisant, la vente est refusée et rien n'est modifié (transaction).
- Le prix de vente est **figé** dans la ligne de vente (un changement de prix ultérieur ne modifie pas l'historique).
- Une vente ne peut pas être modifiée ni supprimée, mais elle peut être **annulée** : les produits retournent en stock et la vente est exclue des statistiques et des rapports (elle reste visible, marquée « Annulée »).
- Le prix d'achat est aussi figé à la vente, ce qui permet de calculer le bénéfice exact.
- Un produit déjà vendu ne peut pas être supprimé.
- Supprimer un client conserve ses ventes (« client de passage »).

## Structure

```
gestion-boutique/
├── backend/            # Django
│   ├── config/         # réglages du projet (settings, urls)
│   ├── boutique/       # application : models, serializers, views, admin, tests
│   ├── db.sqlite3      # base de données
│   └── requirements.txt
└── frontend/           # React
    ├── src/pages/      # Dashboard, Produits, Categories, Clients, Ventes
    ├── src/api.js      # appels à l'API
    └── package.json
```

Bibliothèque PDF : `reportlab` (installée avec `requirements.txt`).

Modèle de données : `Categorie` 1—N `Produit` ; `Client` 1—N `Vente` ; `Vente` 1—N `LigneVente` N—1 `Produit`.

## Installation et lancement

Prérequis : Python 3.12+ et Node.js 18+.

### 1. Backend (terminal 1)

```bash
cd backend
python -m venv venv
# Windows : venv\Scripts\activate      Linux/Mac : source venv/bin/activate
pip install -r requirements.txt
python manage.py runserver
```

L'API est disponible sur http://127.0.0.1:8000/api/ (la base est déjà prête).

**Compte de connexion : `admin` / `admin1234`** (à changer en production : `python manage.py changepassword admin`).
Pour repartir d'une base vide : supprimer `db.sqlite3`, puis
`python manage.py migrate` et `python manage.py seed` (crée le compte admin et les données de démonstration).

### 2. Frontend (terminal 2)

```bash
cd frontend
npm install
npm run dev
```

Ouvrir http://localhost:5173

### Facultatif
- Créer un autre utilisateur : `python manage.py createsuperuser`
- Interface d'administration Django : http://127.0.0.1:8000/admin/
- Tests du backend : `python manage.py test`

## Points d'API

`GET/POST /api/produits/`, `GET/PUT/DELETE /api/produits/{id}/` (recherche : `?q=`), idem pour `/api/categories/` et `/api/clients/` ; `GET/POST /api/ventes/`, `GET /api/ventes/{id}/`, `POST /api/ventes/{id}/annuler/`, `GET /api/ventes/{id}/facture/` (PDF) ; `GET /api/statistiques/` ; `GET /api/rapport/?debut=AAAA-MM-JJ&fin=AAAA-MM-JJ` ; `POST /api/login/` (renvoie le jeton), `POST /api/logout/`.
Toutes les routes sauf `/api/login/` exigent l'en-tête `Authorization: Token <jeton>`.

## Hébergement en ligne (Render)

Voir le guide pas à pas : **`GUIDE_HEBERGEMENT.md`** (GitHub, base PostgreSQL, service web, vérification, dépannage).

Résumé : le site complet (Django + React compilé dans `backend/frontend_dist`) tourne dans **un seul service web** Render avec une base PostgreSQL.
Réglages du service : Root Directory `backend` ; Build `pip install -r requirements.txt && python manage.py collectstatic --noinput` ; Start `python manage.py migrate --noinput && python manage.py seed && gunicorn config.wsgi:application` ; variables `PYTHON_VERSION=3.12.8`, `DATABASE_URL`, `SECRET_KEY`, `ADMIN_PASSWORD`.
Page de contrôle : `/api/sante/`.
