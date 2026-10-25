import { useEffect, useState } from "react";
import { api } from "../api.js";
import { ariary } from "../format.js";

const iso = (d) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const ilYa = (jours) => {
  const d = new Date();
  d.setDate(d.getDate() - jours);
  return iso(d);
};
const jourFr = (j) => new Date(`${j}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });

export default function Rapports() {
  const [debut, setDebut] = useState(ilYa(29));
  const [fin, setFin] = useState(iso(new Date()));
  const [r, setR] = useState(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    if (!debut || !fin) return;
    api.rapport(debut, fin).then((d) => { setR(d); setErreur(""); }).catch((e) => { setR(null); setErreur(e.message); });
  }, [debut, fin]);

  const raccourci = (jours) => { setDebut(ilYa(jours)); setFin(iso(new Date())); };
  const maxCa = r ? Math.max(1, ...r.par_jour.map((j) => Number(j.chiffre_affaires))) : 1;

  return (
    <>
      <div className="entete">
        <h2>Rapport des ventes</h2>
        <button className="btn gris cacher-impression" onClick={() => window.print()}>🖨️ Imprimer</button>
      </div>

      <div className="filtres cacher-impression">
        <label>Du <input type="date" value={debut} max={fin} onChange={(e) => setDebut(e.target.value)} /></label>
        <label>Au <input type="date" value={fin} min={debut} onChange={(e) => setFin(e.target.value)} /></label>
        <button className="btn-petit" onClick={() => raccourci(0)}>Aujourd'hui</button>
        <button className="btn-petit" onClick={() => raccourci(6)}>7 derniers jours</button>
        <button className="btn-petit" onClick={() => raccourci(29)}>30 derniers jours</button>
      </div>

      {erreur && <p className="erreur">{erreur}</p>}
      {r && (
        <>
          <p className="periode">Période : du {jourFr(r.debut)} au {jourFr(r.fin)}</p>
          <div className="cartes">
            <div className="carte"><span>Chiffre d'affaires</span><strong>{ariary(r.chiffre_affaires)}</strong></div>
            <div className="carte"><span>Bénéfice</span><strong>{ariary(r.benefice)}</strong></div>
            <div className="carte"><span>Nombre de ventes</span><strong>{r.nb_ventes}</strong></div>
            <div className="carte"><span>Articles vendus</span><strong>{r.articles_vendus}</strong></div>
            <div className="carte"><span>Ventes annulées</span><strong>{r.nb_annulees}</strong></div>
          </div>

          <div className="deux-colonnes">
            <section className="panneau">
              <h3>Ventes par jour</h3>
              {r.par_jour.length === 0 ? (
                <p className="vide">Aucune vente sur cette période.</p>
              ) : (
                <div className="barres">
                  {r.par_jour.map((j) => (
                    <div className="barre-ligne" key={j.jour}>
                      <span className="barre-date">{jourFr(j.jour)}</span>
                      <div className="barre-fond">
                        <div className="barre-remplie" style={{ width: `${(Number(j.chiffre_affaires) / maxCa) * 100}%` }} />
                      </div>
                      <span className="barre-valeur">{ariary(j.chiffre_affaires)} <small>({j.nb_ventes})</small></span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="panneau">
              <h3>Produits les plus vendus</h3>
              {r.meilleurs_produits.length === 0 ? (
                <p className="vide">Aucune vente sur cette période.</p>
              ) : (
                <table>
                  <thead><tr><th>Produit</th><th>Quantité</th><th>Montant</th></tr></thead>
                  <tbody>
                    {r.meilleurs_produits.map((m) => (
                      <tr key={m.nom}><td>{m.nom}</td><td>{m.quantite}</td><td>{ariary(m.montant)}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
