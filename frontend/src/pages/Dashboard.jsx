import { useEffect, useState } from "react";
import { api } from "../api.js";
import { ariary } from "../format.js";

export default function Dashboard() {
  const [s, setS] = useState(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    api.statistiques().then(setS).catch((e) => setErreur(e.message));
  }, []);

  if (erreur) return <p className="erreur">{erreur}</p>;
  if (!s) return <p>Chargement…</p>;

  const cartes = [
    ["Chiffre d'affaires total", ariary(s.chiffre_affaires)],
    ["Ventes d'aujourd'hui", `${s.ventes_aujourdhui} (${ariary(s.ca_aujourdhui)})`],
    ["Nombre de ventes", s.nb_ventes],
    ["Produits", s.nb_produits],
    ["Clients", s.nb_clients],
    ["Valeur du stock (prix d'achat)", ariary(s.valeur_stock)],
  ];

  return (
    <>
      <h2>Tableau de bord</h2>
      <div className="cartes">
        {cartes.map(([titre, valeur]) => (
          <div className="carte" key={titre}>
            <span>{titre}</span>
            <strong>{valeur}</strong>
          </div>
        ))}
      </div>

      <div className="deux-colonnes">
        <section className="panneau">
          <h3>⚠️ Produits en alerte de stock</h3>
          {s.produits_en_alerte.length === 0 ? (
            <p className="vide">Aucun produit en alerte.</p>
          ) : (
            <table>
              <thead><tr><th>Produit</th><th>Stock</th><th>Seuil</th></tr></thead>
              <tbody>
                {s.produits_en_alerte.map((p) => (
                  <tr key={p.id}>
                    <td>{p.nom}</td>
                    <td><span className="badge rouge">{p.stock}</span></td>
                    <td>{p.seuil_alerte}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panneau">
          <h3>🏆 Meilleures ventes</h3>
          {s.meilleurs_produits.length === 0 ? (
            <p className="vide">Aucune vente pour le moment.</p>
          ) : (
            <table>
              <thead><tr><th>Produit</th><th>Quantité vendue</th></tr></thead>
              <tbody>
                {s.meilleurs_produits.map((m) => (
                  <tr key={m.nom}><td>{m.nom}</td><td>{m.quantite}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
