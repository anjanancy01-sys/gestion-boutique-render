import { useState } from "react";
import { api } from "../api.js";

export default function Login({ onConnecte }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(e) {
    e.preventDefault();
    setEnvoi(true);
    setErreur("");
    try {
      const response = await fetch('https://anaran-ny-backend.onrender.com/api/token/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ username, password }),
});
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="login-fond">
      <form className="login-carte" onSubmit={soumettre}>
        <h1>🛒 Ma Boutique</h1>
        <p className="sous-titre">Connectez-vous pour gérer votre boutique</p>
        <label>Nom d'utilisateur
          <input autoFocus required value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label>Mot de passe
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {erreur && <p className="erreur">{erreur}</p>}
        <button className="btn" style={{ width: "100%" }} disabled={envoi}>
          {envoi ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
