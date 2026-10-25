from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("categories", views.CategorieViewSet)
router.register("produits", views.ProduitViewSet, basename="produit")
router.register("clients", views.ClientViewSet)
router.register("ventes", views.VenteViewSet)

urlpatterns = [
    path("sante/", views.sante),
    path("login/", views.login),
    path("logout/", views.logout),
    path("statistiques/", views.statistiques),
    path("rapport/", views.rapport),
    path("", include(router.urls)),
]
