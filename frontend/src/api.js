const BASE = "/api";

// --- Session : le jeton est gardé dans le navigateur (localStorage) ---
export const session = {
  lire() {
    try {
      return JSON.parse(localStorage.getItem("session")) || null;
    } catch {
      return null;
    }
  },
  ecrire(valeur) {
    try {
      valeur ? localStorage.setItem("session", JSON.stringify(valeur)) : localStorage.removeItem("session");
    } catch {
      /* stockage indisponible : on ignore */
    }
  },
};

let surNonAutorise = () => {};
export const quandNonAutorise = (fn) => { surNonAutorise = fn; };

// Transforme une erreur DRF ({champ: ["msg"]} ou {detail: "msg"}) en texte lisible.
function messageErreur(data, status) {
  if (!data) return `Erreur ${status}`;
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  return Object.entries(data)
    .map(([champ, v]) => {
      const texte = Array.isArray(v) ? v.map((x) => (typeof x === "object" ? JSON.stringify(x) : x)).join(" ") : String(v);
      return champ === "non_field_errors" ? texte : `${champ} : ${texte}`;
    })
    .join(" — ");
}

function entetes() {
  const h = { "Content-Type": "application/json" };
  const s = session.lire();
  if (s?.token) h.Authorization = `Token ${s.token}`;
  return h;
}

async function appeler(chemin, options = {}) {
  try {
    return await fetch(BASE + chemin, {
      ...options,
      headers: entetes(),
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error("Impossible de joindre le serveur. Vérifiez que le backend Django est lancé.");
  }
}

async function requete(chemin, options = {}) {
  const res = await appeler(chemin, options);
  if (res.status === 401 && chemin !== "/login/") {
    surNonAutorise();
    throw new Error("Session expirée. Veuillez vous reconnecter.");
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(messageErreur(data, res.status));
  return data;
}

// Télécharge un fichier (facture PDF) en envoyant le jeton.
async function telecharger(chemin, nomFichier) {
  const res = await appeler(chemin);
  if (res.status === 401) {
    surNonAutorise();
    throw new Error("Session expirée. Veuillez vous reconnecter.");
  }
  if (!res.ok) throw new Error(messageErreur(await res.json().catch(() => null), res.status));
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = nomFichier;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  login: (username, password) => requete("/login/", { method: "POST", body: { username, password } }),
  logout: () => requete("/logout/", { method: "POST" }),
  liste: (ressource, q) => requete(`/${ressource}/${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  creer: (ressource, body) => requete(`/${ressource}/`, { method: "POST", body }),
  modifier: (ressource, id, body) => requete(`/${ressource}/${id}/`, { method: "PUT", body }),
  supprimer: (ressource, id) => requete(`/${ressource}/${id}/`, { method: "DELETE" }),
  statistiques: () => requete("/statistiques/"),
  annulerVente: (id) => requete(`/ventes/${id}/annuler/`, { method: "POST" }),
  facture: (vente) => telecharger(`/ventes/${vente.id}/facture/`, `facture-${vente.numero}.pdf`),
  rapport: (debut, fin) => requete(`/rapport/?debut=${debut}&fin=${fin}`),
};
