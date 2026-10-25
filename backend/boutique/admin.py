from django.contrib import admin

from .models import Categorie, Client, LigneVente, Produit, Vente


@admin.register(Categorie)
class CategorieAdmin(admin.ModelAdmin):
    list_display = ("nom", "description")
    search_fields = ("nom",)


@admin.register(Produit)
class ProduitAdmin(admin.ModelAdmin):
    list_display = ("nom", "categorie", "prix_achat", "prix_vente", "stock", "seuil_alerte")
    list_filter = ("categorie",)
    search_fields = ("nom",)


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ("nom", "telephone", "adresse")
    search_fields = ("nom", "telephone")


class LigneVenteInline(admin.TabularInline):
    model = LigneVente
    extra = 0


@admin.register(Vente)
class VenteAdmin(admin.ModelAdmin):
    list_display = ("id", "client", "date", "total")
    inlines = [LigneVenteInline]
