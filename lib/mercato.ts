// Dati della feature "Confronta la tua polizza".
//
// ATTENZIONE: le forbici di prezzo sono SIMULATE per il prototipo.
// Nella versione vera le fornirebbe il partner (vede i preventivi di tutte le compagnie)
// e, per l'RC auto, si possono incrociare con i dati pubblici IVASS.
// Finanz non è un intermediario: mostriamo un confronto neutro, non diciamo cosa fare.

import type { Ramo } from "@/lib/utenti";

export type Forbice = { min: number; max: number };

// Spesa annua tipica sul mercato per coperture "standard" (simulata).
export const MERCATO: Record<Ramo, Forbice> = {
  rc_auto: { min: 320, max: 460 },
  casa: { min: 140, max: 260 },
  salute: { min: 550, max: 1000 },
  vita: { min: 180, max: 350 },
  dentale: { min: 160, max: 300 },
};

// Fasce del sondaggio in lezione 2 ("Quanto paghi all'anno per la tua polizza?").
export const FASCE: Record<Ramo, [string, string, string]> = {
  rc_auto: ["Meno di 300 €", "Tra 300 e 500 €", "Più di 500 €"],
  casa: ["Meno di 150 €", "Tra 150 e 300 €", "Più di 300 €"],
  salute: ["Meno di 500 €", "Tra 500 e 1.000 €", "Più di 1.000 €"],
  vita: ["Meno di 200 €", "Tra 200 e 400 €", "Più di 400 €"],
  dentale: ["Meno di 150 €", "Tra 150 e 300 €", "Più di 300 €"],
};

export const NON_LO_SO = "Non lo so";
export const NON_CE_L_HO = "Non ce l'ho";

export const MESI = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
];

export const euro = (n: number) => `${n.toLocaleString("it-IT")} €`;

export type Posizione = "sotto" | "dentro" | "sopra";

export function posizione(premio: number, f: Forbice): Posizione {
  if (premio < f.min) return "sotto";
  if (premio > f.max) return "sopra";
  return "dentro";
}

export const HA_GIA = "Sì, ne ho già una o più";

// Chi riceve il flusso "Confronta la tua polizza" a fine percorso.
// Il sondaggio di lezione 2 vale più dell'onboarding, perché è più recente e più preciso:
// "Non ce l'ho" esclude, qualsiasi altra risposta (fascia o "Non lo so") vuol dire che la polizza c'è.
export function haPolizza(intento: string, premio?: string) {
  if (premio === NON_CE_L_HO) return false;
  if (premio) return true;
  return intento === HA_GIA;
}

// Domande sulle coperture del calcolatore. "Non lo so" è sempre possibile, per non far mollare nessuno.
export const FRANCHIGIE = ["Nessuna", "Fino a 250 €", "Più di 250 €", NON_LO_SO];

export const MASSIMALI: Record<Ramo, string[]> = {
  rc_auto: ["Il minimo di legge", "Più alto del minimo", NON_LO_SO],
  casa: ["Fino a 100.000 €", "Più di 100.000 €", NON_LO_SO],
  salute: ["Fino a 50.000 €", "Più di 50.000 €", NON_LO_SO],
  vita: ["Fino a 100.000 €", "Più di 100.000 €", NON_LO_SO],
  dentale: ["Fino a 1.500 € l'anno", "Più di 1.500 € l'anno", NON_LO_SO],
};

// Coperture più ampie costano di più: spostiamo la forbice per confrontare "mele con mele".
// Anche questi coefficienti sono simulati.
export function forbiceSimile(ramo: Ramo, franchigia: string, massimale: string): Forbice {
  let k = 1;
  if (franchigia === FRANCHIGIE[0]) k *= 1.1;
  if (franchigia === FRANCHIGIE[2]) k *= 0.9;
  if (massimale === MASSIMALI[ramo][1]) k *= 1.15;
  const f = MERCATO[ramo];
  const arrotonda = (n: number) => Math.round(n / 10) * 10;
  return { min: arrotonda(f.min * k), max: arrotonda(f.max * k) };
}

// Il promemoria parte un mese prima della scadenza.
export const meseAvviso = (scadenza: number) => MESI[(scadenza + 11) % 12];
