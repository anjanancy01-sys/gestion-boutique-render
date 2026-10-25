from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .models import Categorie, Produit


class BaseAPITest(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user("test", password="secret123")
        self.client.force_authenticate(self.user)
        cat = Categorie.objects.create(nom="Test")
        self.p = Produit.objects.create(nom="Riz", categorie=cat, prix_achat=100, prix_vente=150, stock=10)

    def vendre(self, quantite):
        return self.client.post("/api/ventes/", {"lignes": [{"produit": self.p.id, "quantite": quantite}]}, format="json")


class VenteAPITest(BaseAPITest):
    def test_vente_decremente_stock_et_calcule_total(self):
        r = self.vendre(3)
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(float(r.data["total"]), 450.0)
        self.assertEqual(r.data["numero"], f"F-{r.data['id']:05d}")
        self.p.refresh_from_db()
        self.assertEqual(self.p.stock, 7)

    def test_stock_insuffisant_annule_la_vente(self):
        self.assertEqual(self.vendre(99).status_code, 400)
        self.p.refresh_from_db()
        self.assertEqual(self.p.stock, 10)
        self.assertEqual(self.client.get("/api/ventes/").data, [])

    def test_vente_vide_refusee(self):
        r = self.client.post("/api/ventes/", {"lignes": []}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_produit_vendu_non_supprimable(self):
        self.vendre(1)
        self.assertEqual(self.client.delete(f"/api/produits/{self.p.id}/").status_code, 400)

    def test_statistiques(self):
        r = self.client.get("/api/statistiques/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["nb_produits"], 1)


class AnnulationEtFactureTest(BaseAPITest):
    def test_annulation_remet_le_stock(self):
        vente_id = self.vendre(4).data["id"]
        r = self.client.post(f"/api/ventes/{vente_id}/annuler/")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertTrue(r.data["annulee"])
        self.p.refresh_from_db()
        self.assertEqual(self.p.stock, 10)

    def test_double_annulation_refusee(self):
        vente_id = self.vendre(2).data["id"]
        self.client.post(f"/api/ventes/{vente_id}/annuler/")
        self.assertEqual(self.client.post(f"/api/ventes/{vente_id}/annuler/").status_code, 400)
        self.p.refresh_from_db()
        self.assertEqual(self.p.stock, 10)  # pas de double remise en stock

    def test_vente_annulee_exclue_des_statistiques(self):
        vente_id = self.vendre(2).data["id"]
        self.assertEqual(float(self.client.get("/api/statistiques/").data["chiffre_affaires"]), 300.0)
        self.client.post(f"/api/ventes/{vente_id}/annuler/")
        stats = self.client.get("/api/statistiques/").data
        self.assertEqual(stats["nb_ventes"], 0)
        self.assertEqual(float(stats["chiffre_affaires"]), 0.0)

    def test_facture_pdf(self):
        vente_id = self.vendre(2).data["id"]
        r = self.client.get(f"/api/ventes/{vente_id}/facture/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r["Content-Type"], "application/pdf")
        self.assertTrue(r.content.startswith(b"%PDF"))
        self.assertEqual(self.client.get("/api/ventes/9999/facture/").status_code, 404)


class RapportTest(BaseAPITest):
    def test_rapport_chiffres(self):
        self.vendre(2)  # CA 300, bénéfice 2 x (150-100) = 100
        v2 = self.vendre(1).data["id"]  # CA 150
        self.client.post(f"/api/ventes/{v2}/annuler/")
        r = self.client.get("/api/rapport/")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.data["nb_ventes"], 1)
        self.assertEqual(r.data["nb_annulees"], 1)
        self.assertEqual(float(r.data["chiffre_affaires"]), 300.0)
        self.assertEqual(float(r.data["benefice"]), 100.0)
        self.assertEqual(r.data["articles_vendus"], 2)
        self.assertEqual(len(r.data["par_jour"]), 1)

    def test_rapport_periode_vide_et_dates_invalides(self):
        self.vendre(1)
        r = self.client.get("/api/rapport/?debut=2000-01-01&fin=2000-01-31")
        self.assertEqual(r.data["nb_ventes"], 0)
        self.assertEqual(self.client.get("/api/rapport/?debut=2030-02-01&fin=2030-01-01").status_code, 400)


class AuthTest(APITestCase):
    def test_api_protegee(self):
        self.assertEqual(self.client.get("/api/produits/").status_code, 401)

    def test_login_logout(self):
        get_user_model().objects.create_user("anja", password="secret123")
        self.assertEqual(self.client.post("/api/login/", {"username": "anja", "password": "faux"}).status_code, 400)
        r = self.client.post("/api/login/", {"username": "anja", "password": "secret123"})
        self.assertEqual(r.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {r.data['token']}")
        self.assertEqual(self.client.get("/api/produits/").status_code, 200)
        self.assertEqual(self.client.post("/api/logout/").status_code, 204)
        self.assertEqual(self.client.get("/api/produits/").status_code, 401)


class SanteTest(APITestCase):
    def test_sante_publique(self):
        r = self.client.get("/api/sante/")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data["ok"])
