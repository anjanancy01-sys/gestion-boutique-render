import { useState } from "react";
import { api } from "../api.js";
import Modal from "../components/Modal.jsx";
import useListe from "../components/useListe.js";
import { ariary, dateHeure } from "../format.js";

export default function Ventes() {
  const ventes = useListe("ventes");
  const produits = useListe("produits");
  const clients = useListe("clients");
  const [nouvelle, setNouvelle] = useState(null); // { client, lignes: [{produit, quantite}] }
  const [detail, setDetail] = useState(null);
  const [msg, setMsg] = useState("");

  const prixDe = (id) => Number(produits.donnees.find((p) => p.id === Number(id))?.prix_vente || 0);
  const total = nouvelle ? nouvelle.lignes.reduce((t, l) => t + prixDe(l.produit) * (Number(l.quantite) || 0), 0) : 0;

  function majLigne(i, cle, valeur) {
    const lignes = nouvelle.lignes.map((l, k) => (k === i ? { ...l, [cle]: valeur } : l));
    setNouvelle({ ...nouvelle, lignes });
  }

  async function valider(e) {
    e.preventDefault();
    const lignes = nouvelle.lignes
      .filter((l) => l.produit)
      .map((l) => ({ produit: Number(l.produit), quantite: Number(l.quantite) }));
    try {
      await api.creer("ventes", { client: nouvelle.client ? Number(nouvelle.client) : null, lignes });
      setNouvelle(null);
      setMsg("");
      ventes.rafraichir();
      produits.rafraichir(); // le stock a changé
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function annuler(v) {
    if (!window.confirm(`Annuler la vente ${v.numero} (${ariary(v.total)}) ?\nLes produits seront remis en stock.`)) return;
    try {
      const maj = await api.annulerVente(v.id);
      if (detail) setDetail(maj);
      ventes.rafraichir();
      produits.rafraichir();
    } catch (err) {
      alert(err.message);
    }
  }

  async function facture(v) {
    try {
      await api.facture(v);
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <>
      <div className="entete">
        <h2>Ventes</h2>
        <button className="btn" onClick={() => { setMsg(""); setNouvelle({ client: "", lignes: [{ produit: "", quantite: 1 }] }); }}>
          + Nouvelle vente
        </button>
      </div>
      {ventes.erreur && <p className="erreur">{ventes.erreur}</p>}
      <table>
        <thead><tr><th>N°</th><th>Date</th><th>Client</th><th>Articles</th><th>Total</th><th></th></tr></thead>
        <tbody>
          {ventes.donnees.map((v) => (
            <tr key={v.id} className={v.annulee ? "annulee" : ""}>
              <td>{v.numero}</td>
              <td>{dateHeure(v.date)}</td>
              <td>{v.client_nom || "Client de passage"}</td>
              <td>{v.lignes.reduce((n, l) => n + l.quantite, 0)}</td>
              <td>
                <strong>{ariary(v.total)}</strong>{" "}
                {v.annulee && <span className="badge rouge">Annulée</span>}
              </td>
              <td className="actions">
                <button className="btn-petit" onClick={() => setDetail(v)}>Détail</button>
                <button className="btn-petit" onClick={() => facture(v)}>Facture PDF</button>
                {!v.annulee && <button className="btn-petit danger" onClick={() => annuler(v)}>Annuler</button>}
              </td>
            </tr>
          ))}
          {ventes.donnees.length === 0 && <tr><td colSpan="6" className="vide">Aucune vente enregistrée.</td></tr>}
        </tbody>
      </table>

      {detail && (
        <Modal titre={`Vente ${detail.numero}`} onClose={() => setDetail(null)}>
          <p>
            {dateHeure(detail.date)} — {detail.client_nom || "Client de passage"}{" "}
            {detail.annulee && <span className="badge rouge">Annulée le {dateHeure(detail.date_annulation)}</span>}
          </p>
          <table>
            <thead><tr><th>Produit</th><th>Qté</th><th>Prix unitaire</th><th>Sous-total</th></tr></thead>
            <tbody>
              {detail.lignes.map((l) => (
                <tr key={l.id}>
                  <td>{l.produit_nom}</td><td>{l.quantite}</td>
                  <td>{ariary(l.prix_unitaire)}</td><td>{ariary(l.sous_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="total">Total : {ariary(detail.total)}</p>
          <div className="boutons">
            <button className="btn gris" onClick={() => facture(detail)}>Facture PDF</button>
            {!detail.annulee && <button className="btn danger-plein" onClick={() => annuler(detail)}>Annuler la vente</button>}
          </div>
        </Modal>
      )}

      {nouvelle && (
        <Modal titre="Nouvelle vente" onClose={() => setNouvelle(null)}>
          <form onSubmit={valider}>
            <label>Client (facultatif)
              <select value={nouvelle.client} onChange={(e) => setNouvelle({ ...nouvelle, client: e.target.value })}>
                <option value="">Client de passage</option>
                {clients.donnees.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </label>

            {nouvelle.lignes.map((l, i) => {
              const p = produits.donnees.find((x) => x.id === Number(l.produit));
              return (
                <div className="ligne-vente" key={i}>
                  <select required value={l.produit} onChange={(e) => majLigne(i, "produit", e.target.value)}>
                    <option value="">— Produit —</option>
                    {produits.donnees.map((x) => (
                      <option key={x.id} value={x.id} disabled={x.stock === 0}>
                        {x.nom} ({ariary(x.prix_vente)}) — stock : {x.stock}
                      </option>
                    ))}
                  </select>
                  <input type="number" min="1" max={p?.stock || undefined} required value={l.quantite}
                    onChange={(e) => majLigne(i, "quantite", e.target.value)} />
                  <span className="sous-total">{ariary(prixDe(l.produit) * (Number(l.quantite) || 0))}</span>
                  <button type="button" className="btn-icone" title="Retirer"
                    disabled={nouvelle.lignes.length === 1}
                    onClick={() => setNouvelle({ ...nouvelle, lignes: nouvelle.lignes.filter((_, k) => k !== i) })}>×</button>
                </div>
              );
            })}
            <button type="button" className="btn-petit"
              onClick={() => setNouvelle({ ...nouvelle, lignes: [...nouvelle.lignes, { produit: "", quantite: 1 }] })}>
              + Ajouter un produit
            </button>

            <p className="total">Total : {ariary(total)}</p>
            {msg && <p className="erreur">{msg}</p>}
            <div className="boutons">
              <button type="button" className="btn gris" onClick={() => setNouvelle(null)}>Annuler</button>
              <button className="btn">Valider la vente</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
