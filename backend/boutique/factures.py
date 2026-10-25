"""Génération de la facture PDF d'une vente (bibliothèque reportlab)."""
from io import BytesIO

from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def ar(valeur):
    """Formate un montant : 1234567 -> '1 234 567 Ar'."""
    return f"{int(round(float(valeur))):,}".replace(",", " ") + " Ar"


def generer_facture(vente, nom_boutique="Ma Boutique"):
    tampon = BytesIO()
    doc = SimpleDocTemplate(
        tampon, pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm, topMargin=2 * cm, bottomMargin=2 * cm,
        title=f"Facture F-{vente.pk:05d}",
    )
    styles = getSampleStyleSheet()
    titre = ParagraphStyle("titre", parent=styles["Title"], textColor=colors.HexColor("#1e3a8a"), alignment=0)
    normal = styles["Normal"]
    date_locale = timezone.localtime(vente.date).strftime("%d/%m/%Y à %H:%M")
    client = vente.client.nom if vente.client else "Client de passage"

    contenu = [
        Paragraph(nom_boutique, titre),
        Paragraph(f"<b>FACTURE N° F-{vente.pk:05d}</b>", styles["Heading2"]),
        Paragraph(f"Date : {date_locale}", normal),
        Paragraph(f"Client : {client}", normal),
    ]
    if vente.client and (vente.client.telephone or vente.client.adresse):
        contenu.append(Paragraph(f"{vente.client.telephone} — {vente.client.adresse}".strip(" —"), normal))
    if vente.annulee:
        contenu.append(Spacer(1, 0.3 * cm))
        contenu.append(Paragraph('<font color="#dc2626"><b>VENTE ANNULÉE</b></font>', styles["Heading3"]))
    contenu.append(Spacer(1, 0.7 * cm))

    lignes = [["Produit", "Qté", "Prix unitaire", "Sous-total"]]
    for l in vente.lignes.select_related("produit"):
        lignes.append([l.produit.nom, str(l.quantite), ar(l.prix_unitaire), ar(l.sous_total)])
    lignes.append(["", "", "TOTAL", ar(vente.total)])

    tableau = Table(lignes, colWidths=[7.5 * cm, 2 * cm, 3.7 * cm, 3.8 * cm], repeatRows=1)
    tableau.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a8a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -2), 0.4, colors.HexColor("#d1d5db")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, colors.HexColor("#f3f4f6")]),
        ("FONTNAME", (2, -1), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (2, -1), (-1, -1), 12),
        ("LINEABOVE", (2, -1), (-1, -1), 1, colors.black),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    contenu += [tableau, Spacer(1, 1 * cm), Paragraph("Merci de votre confiance !", normal)]
    doc.build(contenu)
    return tampon.getvalue()
