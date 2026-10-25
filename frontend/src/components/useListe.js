import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";

// Charge une liste depuis l'API et expose rafraîchir / erreur / chargement.
export default function useListe(ressource, q) {
  const [donnees, setDonnees] = useState([]);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(true);

  const rafraichir = useCallback(async () => {
    try {
      setDonnees(await api.liste(ressource, q));
      setErreur("");
    } catch (e) {
      setErreur(e.message);
    } finally {
      setChargement(false);
    }
  }, [ressource, q]);

  useEffect(() => {
    rafraichir();
  }, [rafraichir]);

  return { donnees, erreur, chargement, rafraichir };
}
