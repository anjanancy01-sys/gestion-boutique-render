import { useState } from "react";
import { api } from "../api.js";
import Modal from "../components/Modal.jsx";
import useListe from "../components/useListe.js";
import { ariary } from "../format.js";

const VIDE = { nom: "", categorie: "", prix_achat: 0, prix_vente: 0, stock: 0, seuil_alerte: 5 };

export default function Produits() {
  const [recherche, setRecherche] = useState("");
  const { donnees, erreur, rafraichir } = useListe("produits", recherche);
  const categories = useListe("categories").donnees;
  const [edition, setEdition] = useState(null);
  const [msg, setMsg] = useState("");

  async function enregistrer(e) {
    e.preventDefault();
    try {
      const corps = {
        nom: edition.nom,
        categorie: edition.categorie === "" ? null : Number(edition.categorie),
        prix_achat: edition.prix_achat,
        prix_vente: edition.prix_vente,
        stock: Number(edition.stock),
        seuil_alerte: Number(edition.seuil_alerte),
      };
      edition.id ? await api.modifier("produits", edition.id, corps) : await api.creer("produits", corps);
      setEdition(null);
      setMsg("");
      rafraichir();
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function supprimer(p) {
    if (!window.confirm(`Supprimer le produit « ${p.nom} » ?`)) return;
    try {
      await api.supprimer("produits", p.id);
      rafraichir();
    } catch (err) {
      alert(err.message);
    }
  }

  const num = (cle, label, min = 0) => (
    <label>{label}
      <input type="number" min={min} step={cle.startsWith("prix") ? "0.01" : "1"} required
        value={edition[cle]} onChange={(e) => setEdition({ ...edition, [cle]: e.target.value })} />
    </label>
  );

  return (
    <>
      <div className="entete">
        <h2>Produits</h2>
        <div className="barre">
          <input className="recherche" placeholder="🔍 Rechercher un produit…" value={recherche}
            onChange={(e) => setRecherche(e.target.value)} />
          <button className="btn" onClick={() => { setMsg(""); setEdition({ ...VIDE }); }}>+ Nouveau produit</button>
        </div>
      </div>
      {erreur && <p className="erreur">{erreur}</p>}
      <table>
        <thead>
          <tr><th>Nom</th><th>Catégorie</th><th>Prix d'achat</th><th>Prix de vente</th><th>Stock</th><th></th></tr>
        </thead>
        <tbody>
          {donnees.map((p) => (
            <tr key={p.id}>
              <td>{p.nom}</td>
              <td>{p.categorie_nom || "—"}</td>
              <td>{ariary(p.prix_achat)}</td>
              <td>{ariary(p.prix_vente)}</td>
              <td><span className={`badge ${p.en_alerte ? "rouge" : "vert"}`}>{p.stock}</span></td>
              <td className="actions">
                <button className="btn-petit" onClick={() => { setMsg(""); setEdition({ ...p, categorie: p.categorie ?? "" }); }}>Modifier</button>
                <button className="btn-petit danger" onClick={() => supprimer(p)}>Supprimer</button>
              </td>
            </tr>
          ))}
          {donnees.length === 0 && <tr><td colSpan="6" className="vide">Aucun produit.</td></tr>}
        </tbody>
      </table>

      {edition && (
        <Modal titre={edition.id ? "Modifier le produit" : "Nouveau produit"} onClose={() => setEdition(null)}>
          <form onSubmit={enregistrer}>
            <label>Nom
              <input required value={edition.nom} onChange={(e) => setEdition({ ...edition, nom: e.target.value })} />
            </label>
            <label>Catégorie
              <select value={edition.categorie} onChange={(e) => setEdition({ ...edition, categorie: e.target.value })}>
                <option value="">— Aucune —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </label>
            <div className="grille2">
              {num("prix_achat", "Prix d'achat (Ar)")}
              {num("prix_vente", "Prix de vente (Ar)")}
              {num("stock", "Stock")}
              {num("seuil_alerte", "Seuil d'alerte")}
            </div>
            {msg && <p className="erreur">{msg}</p>}
            <div className="boutons">
              <button type="button" className="btn gris" onClick={() => setEdition(null)}>Annuler</button>
              <button className="btn">Enregistrer</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
