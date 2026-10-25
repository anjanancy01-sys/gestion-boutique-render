import { useState } from "react";
import { api } from "../api.js";
import Modal from "../components/Modal.jsx";
import useListe from "../components/useListe.js";

const VIDE = { nom: "", telephone: "", adresse: "" };

export default function Clients() {
  const { donnees, erreur, rafraichir } = useListe("clients");
  const [edition, setEdition] = useState(null);
  const [msg, setMsg] = useState("");

  async function enregistrer(e) {
    e.preventDefault();
    try {
      const { id, ...corps } = edition;
      id ? await api.modifier("clients", id, corps) : await api.creer("clients", corps);
      setEdition(null);
      setMsg("");
      rafraichir();
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function supprimer(c) {
    if (!window.confirm(`Supprimer le client « ${c.nom} » ? Ses ventes seront conservées.`)) return;
    try {
      await api.supprimer("clients", c.id);
      rafraichir();
    } catch (err) {
      alert(err.message);
    }
  }

  const champ = (cle, label, requis) => (
    <label>{label}
      <input required={requis} value={edition[cle]} onChange={(e) => setEdition({ ...edition, [cle]: e.target.value })} />
    </label>
  );

  return (
    <>
      <div className="entete">
        <h2>Clients</h2>
        <button className="btn" onClick={() => { setMsg(""); setEdition({ ...VIDE }); }}>+ Nouveau client</button>
      </div>
      {erreur && <p className="erreur">{erreur}</p>}
      <table>
        <thead><tr><th>Nom</th><th>Téléphone</th><th>Adresse</th><th></th></tr></thead>
        <tbody>
          {donnees.map((c) => (
            <tr key={c.id}>
              <td>{c.nom}</td><td>{c.telephone}</td><td>{c.adresse}</td>
              <td className="actions">
                <button className="btn-petit" onClick={() => { setMsg(""); setEdition(c); }}>Modifier</button>
                <button className="btn-petit danger" onClick={() => supprimer(c)}>Supprimer</button>
              </td>
            </tr>
          ))}
          {donnees.length === 0 && <tr><td colSpan="4" className="vide">Aucun client.</td></tr>}
        </tbody>
      </table>

      {edition && (
        <Modal titre={edition.id ? "Modifier le client" : "Nouveau client"} onClose={() => setEdition(null)}>
          <form onSubmit={enregistrer}>
            {champ("nom", "Nom", true)}
            {champ("telephone", "Téléphone")}
            {champ("adresse", "Adresse")}
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
