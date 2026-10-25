from django.db import transaction
from rest_framework import serializers

from .models import Categorie, Client, LigneVente, Produit, Vente


class CategorieSerializer(serializers.ModelSerializer):
    nb_produits = serializers.IntegerField(source="produits.count", read_only=True)

    class Meta:
        model = Categorie
        fields = ["id", "nom", "description", "nb_produits"]


class ProduitSerializer(serializers.ModelSerializer):
    categorie_nom = serializers.CharField(source="categorie.nom", read_only=True, default=None)
    en_alerte = serializers.SerializerMethodField()

    class Meta:
        model = Produit
        fields = [
            "id", "nom", "categorie", "categorie_nom", "prix_achat", "prix_vente",
            "stock", "seuil_alerte", "en_alerte", "date_creation",
        ]
        read_only_fields = ["date_creation"]

    def get_en_alerte(self, obj):
        return obj.stock <= obj.seuil_alerte


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ["id", "nom", "telephone", "adresse"]


class LigneVenteSerializer(serializers.ModelSerializer):
    produit_nom = serializers.CharField(source="produit.nom", read_only=True)
    sous_total = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = LigneVente
        fields = ["id", "produit", "produit_nom", "quantite", "prix_unitaire", "sous_total"]
        read_only_fields = ["prix_unitaire"]


class VenteSerializer(serializers.ModelSerializer):
    lignes = LigneVenteSerializer(many=True)
    client_nom = serializers.CharField(source="client.nom", read_only=True, default=None)
    numero = serializers.SerializerMethodField()

    class Meta:
        model = Vente
        fields = ["id", "numero", "client", "client_nom", "date", "total", "annulee", "date_annulation", "lignes"]
        read_only_fields = ["date", "total", "annulee", "date_annulation"]

    def get_numero(self, obj):
        return f"F-{obj.pk:05d}"

    def validate_lignes(self, lignes):
        if not lignes:
            raise serializers.ValidationError("Ajoutez au moins un produit.")
        return lignes

    @transaction.atomic
    def create(self, validated_data):
        lignes = validated_data.pop("lignes")
        vente = Vente.objects.create(**validated_data)
        total = 0
        for ligne in lignes:
            # Verrouille la ligne produit pour éviter les ventes concurrentes sur le même stock
            produit = Produit.objects.select_for_update().get(pk=ligne["produit"].pk)
            quantite = ligne["quantite"]
            if produit.stock < quantite:
                raise serializers.ValidationError(
                    {"lignes": f"Stock insuffisant pour « {produit.nom} » (disponible : {produit.stock})."}
                )
            produit.stock -= quantite
            produit.save(update_fields=["stock"])
            LigneVente.objects.create(
                vente=vente, produit=produit, quantite=quantite,
                prix_unitaire=produit.prix_vente, prix_achat=produit.prix_achat,
            )
            total += produit.prix_vente * quantite
        vente.total = total
        vente.save(update_fields=["total"])
        return vente
