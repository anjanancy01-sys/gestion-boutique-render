import { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { api, quandNonAutorise, session } from "./api.js";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Produits from "./pages/Produits.jsx";
import Categories from "./pages/Categories.jsx";
import Clients from "./pages/Clients.jsx";
import Ventes from "./pages/Ventes.jsx";
import Rapports from "./pages/Rapports.jsx";

const liens = [
  ["/", "Tableau de bord"],
  ["/ventes", "Ventes"],
  ["/produits", "Produits"],
  ["/categories", "Catégories"],
  ["/clients", "Clients"],
  ["/rapports", "Rapports"],
];

export default function App() {
  const [utilisateur, setUtilisateur] = useState(() => session.lire());

  // Si le serveur répond 401 (jeton invalide), on revient à l'écran de connexion.
  useEffect(() => {
    quandNonAutorise(() => {
      session.ecrire(null);
      setUtilisateur(null);
    });
  }, []);

  function connecte(s) {
    session.ecrire(s);
    setUtilisateur(s);
  }

  async function deconnecter() {
    try {
      await api.logout();
    } catch {
      /* même si le serveur est injoignable, on ferme la session ici */
    }
    session.ecrire(null);
    setUtilisateur(null);
  }

  if (!utilisateur) return <Login onConnecte={connecte} />;

  return (
    <div className="app">
      <aside className="menu">
        <h1>🛒 Ma Boutique</h1>
        <nav>
          {liens.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="utilisateur">
          <span>👤 {utilisateur.username}</span>
          <button className="btn-petit" onClick={deconnecter}>Se déconnecter</button>
        </div>
      </aside>
      <main className="contenu">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/ventes" element={<Ventes />} />
          <Route path="/produits" element={<Produits />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/rapports" element={<Rapports />} />
          <Route path="*" element={<p>Page introuvable.</p>} />
        </Routes>
      </main>
    </div>
  );
}
