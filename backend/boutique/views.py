from datetime import timedelta

from django.contrib.auth import authenticate
from django.db import transaction
from django.db.models import Count, DecimalField, ExpressionWrapper, F, Sum
from django.db.models.deletion import ProtectedError
from django.db.models.functions import TruncDate
from django.conf import settings
from django.http import Http404, HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import mixins, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .factures import generer_facture
from .models import Categorie, Client, LigneVente, Produit, Vente
from .serializers import (
    CategorieSerializer,
    ClientSerializer,
    ProduitSerializer,
    VenteSerializer,
)


# ---------------------------------------------------------------- Authentification
@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def login(request):
    user = authenticate(
        username=request.data.get("username", ""), password=request.data.get("password", "")
    )
    if user is None:
        return Response(
            {"detail": "Nom d'utilisateur ou mot de passe incorrect."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "username": user.username})


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def sante(request):
    """Page de contrôle publique : /api/sante/ répond {"ok": true} si le serveur et la base fonctionnent."""
    from django.db import connection

    with connection.cursor() as c:
        c.execute("SELECT 1")
    return Response({"ok": True, "base": connection.vendor})


@api_view(["POST"])
def logout(request):
    Token.objects.filter(user=request.user).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------- CRUD
class CategorieViewSet(viewsets.ModelViewSet):
    queryset = Categorie.objects.all()
    serializer_class = CategorieSerializer


class ProduitViewSet(viewsets.ModelViewSet):
    serializer_class = ProduitSerializer

    def get_queryset(self):
        qs = Produit.objects.select_related("categorie")
        q = self.request.query_params.get("q")
        if q:
            qs = qs.filter(nom__icontains=q)
        return qs

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "Ce produit a déjà été vendu et ne peut pas être supprimé."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer


class VenteViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Une vente n'est jamais modifiée ni supprimée : on peut seulement l'annuler."""

    queryset = Vente.objects.select_related("client").prefetch_related("lignes__produit")
    serializer_class = VenteSerializer

    @action(detail=True, methods=["post"])
    def annuler(self, request, pk=None):
        """Annule la vente et remet les quantités en stock."""
        with transaction.atomic():
            vente = get_object_or_404(Vente.objects.select_for_update(), pk=pk)
            if vente.annulee:
                return Response(
                    {"detail": "Cette vente est déjà annulée."}, status=status.HTTP_400_BAD_REQUEST
                )
            for ligne in vente.lignes.all():
                Produit.objects.filter(pk=ligne.produit_id).update(stock=F("stock") + ligne.quantite)
            vente.annulee = True
            vente.date_annulation = timezone.now()
            vente.save(update_fields=["annulee", "date_annulation"])
        return Response(self.get_serializer(self.get_queryset().get(pk=pk)).data)

    @action(detail=True, methods=["get"])
    def facture(self, request, pk=None):
        """Télécharge la facture au format PDF."""
        vente = self.get_object()
        reponse = HttpResponse(generer_facture(vente), content_type="application/pdf")
        reponse["Content-Disposition"] = f'attachment; filename="facture-{vente.pk:05d}.pdf"'
        return reponse


# ---------------------------------------------------------------- Statistiques et rapports
@api_view(["GET"])
def statistiques(request):
    aujourd_hui = timezone.localdate()
    valides = Vente.objects.filter(annulee=False)
    ventes_jour = valides.filter(date__date=aujourd_hui)
    meilleurs = (
        LigneVente.objects.filter(vente__annulee=False)
        .values("produit__nom")
        .annotate(quantite=Sum("quantite"))
        .order_by("-quantite")[:5]
    )
    return Response(
        {
            "nb_produits": Produit.objects.count(),
            "nb_clients": Client.objects.count(),
            "nb_ventes": valides.count(),
            "chiffre_affaires": valides.aggregate(t=Sum("total"))["t"] or 0,
            "ventes_aujourdhui": ventes_jour.count(),
            "ca_aujourdhui": ventes_jour.aggregate(t=Sum("total"))["t"] or 0,
            "valeur_stock": sum(p.stock * p.prix_achat for p in Produit.objects.all()),
            "produits_en_alerte": ProduitSerializer(
                Produit.objects.filter(stock__lte=F("seuil_alerte")).select_related("categorie"),
                many=True,
            ).data,
            "meilleurs_produits": [
                {"nom": m["produit__nom"], "quantite": m["quantite"]} for m in meilleurs
            ],
        }
    )


@api_view(["GET"])
def rapport(request):
    """Rapport des ventes entre deux dates (?debut=AAAA-MM-JJ&fin=AAAA-MM-JJ)."""
    aujourd_hui = timezone.localdate()
    fin = parse_date(request.query_params.get("fin") or "") or aujourd_hui
    debut = parse_date(request.query_params.get("debut") or "") or fin - timedelta(days=29)
    if debut > fin:
        return Response(
            {"detail": "La date de début doit être antérieure à la date de fin."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    periode = Vente.objects.filter(date__date__gte=debut, date__date__lte=fin)
    valides = periode.filter(annulee=False)
    lignes = LigneVente.objects.filter(vente__in=valides)

    benefice_expr = ExpressionWrapper(
        (F("prix_unitaire") - F("prix_achat")) * F("quantite"),
        output_field=DecimalField(max_digits=16, decimal_places=2),
    )
    par_jour = (
        valides.annotate(jour=TruncDate("date"))
        .values("jour")
        .annotate(nb_ventes=Count("id"), chiffre_affaires=Sum("total"))
        .order_by("jour")
    )
    top = (
        lignes.values("produit__nom")
        .annotate(qte=Sum("quantite"), montant=Sum(F("prix_unitaire") * F("quantite")))
        .order_by("-qte")[:10]
    )
    return Response(
        {
            "debut": debut,
            "fin": fin,
            "nb_ventes": valides.count(),
            "nb_annulees": periode.filter(annulee=True).count(),
            "chiffre_affaires": valides.aggregate(t=Sum("total"))["t"] or 0,
            "benefice": lignes.aggregate(t=Sum(benefice_expr))["t"] or 0,
            "articles_vendus": lignes.aggregate(t=Sum("quantite"))["t"] or 0,
            "par_jour": [
                {"jour": j["jour"], "nb_ventes": j["nb_ventes"], "chiffre_affaires": j["chiffre_affaires"]}
                for j in par_jour
            ],
            "meilleurs_produits": [
                {"nom": t["produit__nom"], "quantite": t["qte"], "montant": t["montant"]} for t in top
            ],
        }
    )


# ---------------------------------------------------------------- Application React
def application_react(request):
    """Renvoie index.html (React) pour toutes les pages ; le routage est fait côté navigateur."""
    index = settings.BASE_DIR / "frontend_dist" / "index.html"
    if not index.exists():
        raise Http404("Application React non compilée (voir README : npm run build).")
    return HttpResponse(index.read_text(encoding="utf-8"), content_type="text/html")
