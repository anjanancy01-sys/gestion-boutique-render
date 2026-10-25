const nombre = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
export const ariary = (v) => `${nombre.format(Number(v) || 0)} Ar`;
export const dateHeure = (iso) =>
  new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
