import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from boutique.models import Categorie, Client, Produit


class Command(BaseCommand):
    help = "Remplit la base avec des données de démonstration."

    def handle(self, *args, **options):
        User = get_user_model()
        mot_de_passe = os.environ.get("ADMIN_PASSWORD")  # défini sur Render
        admin = User.objects.filter(username="admin").first()
        if admin is None:
            User.objects.create_superuser("admin", "", mot_de_passe or "admin1234")
            self.stdout.write("Compte administrateur créé : admin")
        elif mot_de_passe:
            # Permet de changer le mot de passe depuis Render (le plan gratuit n'a pas de terminal).
            admin.set_password(mot_de_passe)
            admin.save()
        if Produit.objects.exists():
            self.stdout.write("Données déjà présentes, rien à faire.")
            return
        cats = {n: Categorie.objects.create(nom=n) for n in
                ["Alimentation", "Boissons", "Hygiène", "Papeterie", "Électronique"]}
        data = [
            ("Riz 5 kg", "Alimentation", 9000, 11000, 40, 10),
            ("Huile 1 L", "Alimentation", 4500, 5500, 25, 8),
            ("Sucre 1 kg", "Alimentation", 2800, 3500, 30, 10),
            ("Eau minérale 1,5 L", "Boissons", 1200, 1800, 60, 15),
            ("Jus d'orange 1 L", "Boissons", 3000, 4000, 18, 6),
            ("Savon", "Hygiène", 800, 1200, 50, 12),
            ("Dentifrice", "Hygiène", 2500, 3500, 4, 5),
            ("Cahier 96 pages", "Papeterie", 1500, 2200, 70, 15),
            ("Stylo bleu", "Papeterie", 300, 500, 120, 30),
            ("Chargeur USB", "Électronique", 6000, 9000, 3, 4),
        ]
        for nom, cat, pa, pv, stock, seuil in data:
            Produit.objects.create(nom=nom, categorie=cats[cat], prix_achat=pa,
                                   prix_vente=pv, stock=stock, seuil_alerte=seuil)
        for nom, tel, adr in [
            ("Rakoto Jean", "034 00 000 01", "Antananarivo"),
            ("Rasoa Marie", "033 00 000 02", "Mahajanga"),
            ("Andry Hery", "032 00 000 03", "Toamasina"),
        ]:
            Client.objects.create(nom=nom, telephone=tel, adresse=adr)
        self.stdout.write(self.style.SUCCESS("Données de démonstration créées."))
