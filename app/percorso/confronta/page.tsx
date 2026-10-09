"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUtente } from "@/components/Providers";
import { BarraProgresso, BottomBar, Icona, PrimaryButton, SecondaryButton, TastoTondo } from "@/components/ui";
import { NOME_RAMO } from "@/lib/utenti";
import {
  FRANCHIGIE,
  MASSIMALI,
  MESI,
  NON_CE_L_HO,
  NON_LO_SO,
  euro,
  forbiceSimile,
  meseAvviso,
  posizione,
  type Forbice,
  type Posizione,
} from "@/lib/mercato";

// Il calcolatore "Confronta la tua polizza": premio, franchigia, massimale → posizione rispetto al mercato
// → richiesta della scadenza per il promemoria. È la parte che testa l'ipotesi più rischiosa:
// chi è già assicurato ci lascia premio e data di scadenza?

type Passo = "premio" | "franchigia" | "massimale" | "risultato" | "fatto";
const DOMANDE: Passo[] = ["premio", "franchigia", "massimale"];

export default function Confronta() {
  const { utente, progresso, aggiornaProgresso, track } = useUtente();
  const router = useRouter();
  const ramo = NOME_RAMO[utente.ramo];

  const [passo, setPasso] = useState<Passo>("premio");
  const [premio, setPremio] = useState("");
  const [franchigia, setFranchigia] = useState<string | null>(null);
  const [massimale, setMassimale] = useState<string | null>(null);
  const [scadenza, setScadenza] = useState<number | null>(null);

  const cifra = Number(premio.replace(/\D/g, ""));
  const forbice = forbiceSimile(utente.ramo, franchigia ?? "", massimale ?? "");
  const pos = posizione(cifra, forbice);
  const indice = DOMANDE.indexOf(passo);

  const indietro = () => {
    if (indice > 0) setPasso(DOMANDE[indice - 1]);
    else router.back();
  };

  const vediRisultato = () => {
    track("Policy Check Completed", {
      premio: cifra,
      franchigia: franchigia ?? "",
      massimale: massimale ?? "",
      posizione: pos,
    });
    setPasso("risultato");
  };

  if (passo === "fatto" && scadenza !== null) return <Fatto scadenza={scadenza} />;

  if (passo === "risultato")
    return (
      <Risultato
        cifra={cifra}
        forbice={forbice}
        pos={pos}
        incerto={franchigia === NON_LO_SO || massimale === NON_LO_SO}
        scadenza={scadenza}
        setScadenza={setScadenza}
        onAvvisami={() => {
          if (scadenza === null) return;
          track("Renewal Reminder Set", { mese_scadenza: MESI[scadenza], posizione: pos });
          aggiornaProgresso({ scadenza });
          setPasso("fatto");
        }}
        onNo={() => {
          track("Renewal Reminder Skipped", { posizione: pos });
          router.push("/");
        }}
      />
    );

  const suggerimento = progresso.premio && progresso.premio !== NON_LO_SO && progresso.premio !== NON_CE_L_HO;

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-0 z-10 flex items-center gap-4 bg-white px-4 py-4">
        <TastoTondo label="Indietro" onClick={indietro}>
          <Icona nome="back" size={22} />
        </TastoTondo>
        <BarraProgresso valore={((indice + 1) / (DOMANDE.length + 1)) * 100} className="flex-1" />
      </div>

      <div className="flex flex-col gap-5 px-4 pt-4 pb-8">
        {passo === "premio" && (
          <>
            <h1 className="text-[30px] leading-tight font-bold tracking-tight">
              Quanto paghi all&apos;anno per la tua polizza {ramo}?
            </h1>
            {suggerimento && (
              <p className="rounded-2xl bg-box-azzurro px-5 py-3 text-base leading-relaxed">
                In lezione 2 ci avevi detto: <b>{progresso.premio?.toLowerCase()}</b>. Ora serve la cifra esatta, la
                trovi nel contratto o nell&apos;ultimo pagamento.
              </p>
            )}
            <label className="flex items-center gap-3 rounded-2xl border-[1.5px] border-forest px-5 py-4 text-2xl font-semibold">
              <input
                inputMode="numeric"
                autoFocus
                value={premio}
                onChange={(e) => setPremio(e.target.value.replace(/\D/g, "").slice(0, 5))}
                placeholder="420"
                aria-label="Premio annuo in euro"
                className="w-full min-w-0 bg-transparent outline-none placeholder:text-ink/25"
              />
              <span className="shrink-0 text-lg whitespace-nowrap text-muted">€ all&apos;anno</span>
            </label>
          </>
        )}

        {passo === "franchigia" && (
          <Scelta
            titolo="Che franchigia hai?"
            spiegazione="La parte del danno che paghi tu, come nella lezione 3."
            opzioni={FRANCHIGIE}
            valore={franchigia}
            onScegli={setFranchigia}
          />
        )}

        {passo === "massimale" && (
          <Scelta
            titolo={utente.ramo === "vita" ? "Qual è il capitale assicurato?" : "Qual è il massimale?"}
            spiegazione="La cifra massima che la compagnia paga. Se non lo sai, il confronto sarà solo meno preciso."
            opzioni={MASSIMALI[utente.ramo]}
            valore={massimale}
            onScegli={setMassimale}
          />
        )}
      </div>

      <BottomBar>
        {passo === "premio" && (
          <PrimaryButton disabled={cifra < 10} onClick={() => setPasso("franchigia")}>
            Continua
          </PrimaryButton>
        )}
        {passo === "franchigia" && (
          <PrimaryButton disabled={!franchigia} onClick={() => setPasso("massimale")}>
            Continua
          </PrimaryButton>
        )}
        {passo === "massimale" && (
          <PrimaryButton disabled={!massimale} onClick={vediRisultato}>
            Vedi il confronto
          </PrimaryButton>
        )}
      </BottomBar>
    </div>
  );
}

function Scelta({
  titolo,
  spiegazione,
  opzioni,
  valore,
  onScegli,
}: {
  titolo: string;
  spiegazione: string;
  opzioni: string[];
  valore: string | null;
  onScegli: (v: string) => void;
}) {
  return (
    <>
      <h1 className="text-[30px] leading-tight font-bold tracking-tight">{titolo}</h1>
      <p className="text-lg leading-snug text-ink/80">{spiegazione}</p>
      <div className="flex flex-col gap-3">
        {opzioni.map((o) => (
          <button
            key={o}
            onClick={() => onScegli(o)}
            className={`w-full rounded-2xl border-[1.5px] px-4 py-4 text-left text-lg transition active:scale-[0.98] ${
              valore === o ? "border-forest bg-soft font-semibold" : "border-line"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </>
  );
}

// Frasi neutre: descrivono dove sei, non ti dicono cosa fare.
const ESITO: Record<Posizione, { titolo: string; testo: string; richiesta: string }> = {
  sopra: {
    titolo: "Paghi più della media",
    testo: "La maggior parte delle offerte costa meno della tua.",
    richiesta:
      "Cambiare polizza conviene farlo alla scadenza, senza pagare due volte. Vuoi che ti avvisiamo un mese prima, così hai il tempo di confrontare?",
  },
  dentro: {
    titolo: "Sei in linea con il mercato",
    testo: "Paghi una cifra nella media.",
    richiesta: "I prezzi cambiano ogni anno, anche il tuo. Vuoi che ti ricordiamo di ricontrollare un mese prima del rinnovo?",
  },
  sotto: {
    titolo: "Paghi meno della media",
    testo: "La maggior parte delle offerte costa più della tua.",
    richiesta:
      "Al rinnovo il prezzo può salire. Vuoi che ti ricordiamo di ricontrollare un mese prima, così non ti trovi sorprese?",
  },
};

function Risultato({
  cifra,
  forbice,
  pos,
  incerto,
  scadenza,
  setScadenza,
  onAvvisami,
  onNo,
}: {
  cifra: number;
  forbice: Forbice;
  pos: Posizione;
  incerto: boolean;
  scadenza: number | null;
  setScadenza: (m: number) => void;
  onAvvisami: () => void;
  onNo: () => void;
}) {
  const esito = ESITO[pos];
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-5 px-4 pt-8 pb-8">
        <h1 className="text-[32px] leading-tight font-bold tracking-tight">{esito.titolo}</h1>
        <Righello cifra={cifra} forbice={forbice} pos={pos} />
        <p className="text-lg leading-snug">
          Tu paghi <b>{euro(cifra)}</b>. Per coperture simili, il mercato va da <b>{euro(forbice.min)}</b> a{" "}
          <b>{euro(forbice.max)}</b> all&apos;anno. {esito.testo}
        </p>
        {incerto && (
          <p className="rounded-2xl bg-box-rosa px-5 py-3 text-base leading-relaxed">
            Non conosci tutte le coperture, quindi il confronto è indicativo: guarda franchigia e massimale nel contratto.
          </p>
        )}

        <div className="mt-2 flex flex-col gap-4 rounded-3xl bg-soft px-4 py-5">
          <p className="text-xl leading-snug font-bold">🗓️ Quando scade la tua polizza?</p>
          <p className="text-base leading-relaxed text-ink/80">{esito.richiesta}</p>
          <div className="grid grid-cols-4 gap-2">
            {MESI.map((m, i) => (
              <button
                key={m}
                onClick={() => setScadenza(i)}
                className={`rounded-xl border-[1.5px] py-2.5 text-sm font-semibold capitalize transition active:scale-95 ${
                  scadenza === i ? "border-forest bg-kiwi-400 text-forest" : "border-line bg-white"
                }`}
              >
                {m.slice(0, 3)}
              </button>
            ))}
          </div>
          <p className="text-xs leading-relaxed text-muted">
            Basta il mese. Ti avvisiamo solo per questa polizza e puoi annullare quando vuoi.
          </p>
        </div>
        <p className="text-sm text-muted">Prototipo: forbici di prezzo simulate.</p>
      </div>

      <BottomBar>
        <PrimaryButton disabled={scadenza === null} onClick={onAvvisami}>
          {scadenza === null ? "Scegli il mese di scadenza" : `Avvisami a ${meseAvviso(scadenza)}`}
        </PrimaryButton>
        <SecondaryButton onClick={onNo}>No grazie</SecondaryButton>
      </BottomBar>
    </div>
  );
}

// Il righello: la fascia di mercato e il segno di dove sei tu.
function Righello({ cifra, forbice, pos }: { cifra: number; forbice: Forbice; pos: Posizione }) {
  const lo = Math.min(cifra, forbice.min) * 0.75;
  const hi = Math.max(cifra, forbice.max) * 1.2;
  const x = (n: number) => ((n - lo) / (hi - lo)) * 100;
  const colore = pos === "sopra" ? "bg-error" : "bg-forest";
  return (
    <div className="relative mt-8 mb-6 h-4" role="img" aria-label={`Tu ${euro(cifra)}, mercato da ${euro(forbice.min)} a ${euro(forbice.max)}`}>
      <div className="absolute inset-0 rounded-full bg-line" />
      <div
        className="absolute inset-y-0 rounded-full bg-kiwi-300"
        style={{ left: `${x(forbice.min)}%`, width: `${x(forbice.max) - x(forbice.min)}%` }}
      />
      <span
        className="absolute top-full mt-1.5 -translate-x-1/2 text-xs font-semibold whitespace-nowrap text-forest"
        style={{ left: `${(x(forbice.min) + x(forbice.max)) / 2}%` }}
      >
        Mercato
      </span>
      <div className="absolute -top-8 -translate-x-1/2 animate-pop text-center" style={{ left: `${x(cifra)}%` }}>
        <span className={`block rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-white ${colore}`}>Tu</span>
        <span className={`mx-auto mt-0.5 block h-7 w-1 rounded-full ${colore}`} />
      </div>
    </div>
  );
}

function Fatto({ scadenza }: { scadenza: number }) {
  const { utente } = useUtente();
  const router = useRouter();
  const ramo = NOME_RAMO[utente.ramo];
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col items-center gap-4 px-6 pt-12 pb-8 text-center">
        <span className="grid size-28 animate-pop place-items-center rounded-full bg-kiwi-100 text-6xl">🔔</span>
        <h1 className="text-[32px] leading-tight font-bold tracking-tight">Ti avvisiamo a {meseAvviso(scadenza)}</h1>
        <p className="text-lg leading-snug text-ink/80">
          Un mese prima della scadenza di {MESI[scadenza]} ti ricordiamo di confrontare la tua polizza {ramo}.
        </p>
      </div>
      <div className="flex flex-col gap-2 px-4">
        <p className="text-sm font-semibold text-muted">Ecco cosa riceverai (tocca per provarlo):</p>
        <button
          onClick={() => router.push("/percorso/promemoria")}
          className="flex gap-3 rounded-2xl bg-ink/90 px-4 py-3 text-left text-white shadow-lg transition active:scale-[0.98]"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-kiwi-400 text-xl">🥝</span>
          <span className="flex flex-col">
            <span className="text-sm font-bold">
              Finanz <span className="font-normal text-white/60">· {meseAvviso(scadenza)}</span>
            </span>
            <span className="text-sm leading-snug">
              La tua polizza {ramo} scade a {MESI[scadenza]}. Hai un mese per confrontarla con il mercato.
            </span>
          </span>
        </button>
      </div>
      <BottomBar>
        <PrimaryButton onClick={() => router.push("/")}>Torna alla Home</PrimaryButton>
      </BottomBar>
    </div>
  );
}
