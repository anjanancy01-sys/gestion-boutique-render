import { useState } from "react";
import { api } from "../api.js";
import Modal from "../components/Modal.jsx";
import useListe from "../components/useListe.js";

const VIDE = { nom: "", description: "" };

export default function Categories() {
  const { donnees, erreur, rafraichir } = useListe("categories");
  const [edition, setEdition] = useState(null);
  const [msg, setMsg] = useState("");

  async function enregistrer(e) {
    e.preventDefault();
    try {
      const { id, nb_produits, ...corps } = edition;
      id ? await api.modifier("categories", id, corps) : await api.creer("categories", corps);
      setEdition(null);
      setMsg("");
      rafraichir();
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function supprimer(c) {
    if (!window.confirm(`Supprimer la catégorie « ${c.nom} » ?`)) return;
    try {
      await api.supprimer("categories", c.id);
      rafraichir();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <>
      <div className="entete">
        <h2>Catégories</h2>
        <button className="btn" onClick={() => { setMsg(""); setEdition({ ...VIDE }); }}>+ Nouvelle catégorie</button>
      </div>
      {erreur && <p className="erreur">{erreur}</p>}
      <table>
        <thead><tr><th>Nom</th><th>Description</th><th>Produits</th><th></th></tr></thead>
        <tbody>
          {donnees.map((c) => (
            <tr key={c.id}>
              <td>{c.nom}</td>
              <td>{c.description}</td>
              <td>{c.nb_produits}</td>
              <td className="actions">
                <button className="btn-petit" onClick={() => { setMsg(""); setEdition(c); }}>Modifier</button>
                <button className="btn-petit danger" onClick={() => supprimer(c)}>Supprimer</button>
              </td>
            </tr>
          ))}
          {donnees.length === 0 && <tr><td colSpan="4" className="vide">Aucune catégorie.</td></tr>}
        </tbody>
      </table>

      {edition && (
        <Modal titre={edition.id ? "Modifier la catégorie" : "Nouvelle catégorie"} onClose={() => setEdition(null)}>
          <form onSubmit={enregistrer}>
            <label>Nom
              <input required value={edition.nom} onChange={(e) => setEdition({ ...edition, nom: e.target.value })} />
            </label>
            <label>Description
              <textarea value={edition.description} onChange={(e) => setEdition({ ...edition, description: e.target.value })} />
            </label>
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
