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

type Passo = "premio" | "franchigia" | "massimale" | "risultato" | "scadenza" | "fatto";
type Scelta = number | "non_so";
const DOMANDE: Passo[] = ["premio", "franchigia", "massimale"];

export default function Confronta() {
  const { utente, progresso, aggiornaProgresso, track } = useUtente();
  const router = useRouter();
  const ramo = NOME_RAMO[utente.ramo];

  const [passo, setPasso] = useState<Passo>("premio");
  const [premio, setPremio] = useState("");
  const [franchigia, setFranchigia] = useState<string | null>(null);
  const [massimale, setMassimale] = useState<string | null>(null);
  const [scadenza, setScadenza] = useState<Scelta | null>(null);

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
        onContinua={() => setPasso("scadenza")}
      />
    );

  if (passo === "scadenza")
    return (
      <Scadenza
        cifra={cifra}
        forbice={forbice}
        pos={pos}
        scadenza={scadenza}
        setScadenza={setScadenza}
        onAvvisami={() => {
          if (scadenza === null) return;
          track("Renewal Reminder Set", {
            mese_scadenza: scadenza === "non_so" ? "da_verificare" : MESI[scadenza],
            posizione: pos,
          });
          if (scadenza !== "non_so") aggiornaProgresso({ scadenza });
          setPasso("fatto");
        }}
        onSubito={() => {
          track("Partner CTA Clicked", { from: "scadenza_vicina", posizione: pos });
          router.push("/comparatore");
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
const ESITO: Record<Posizione, { titolo: string; testo: string }> = {
  sopra: { titolo: "Paghi più della media", testo: "La maggior parte delle offerte costa meno della tua." },
  dentro: { titolo: "Sei in linea con il mercato", testo: "Paghi una cifra nella media." },
  sotto: { titolo: "Paghi meno della media", testo: "La maggior parte delle offerte costa più della tua." },
};

function Risultato({
  cifra,
  forbice,
  pos,
  incerto,
  onContinua,
}: {
  cifra: number;
  forbice: Forbice;
  pos: Posizione;
  incerto: boolean;
  onContinua: () => void;
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
        <p className="text-sm text-muted">Prototipo: forbici di prezzo simulate.</p>
      </div>
      <BottomBar>
        <PrimaryButton onClick={onContinua}>Continua</PrimaryButton>
      </BottomBar>
    </div>
  );
}

// La schermata che decide se la feature funziona: prima convince, poi chiede.
// 1) il motivo, in euro e detto come fatto; 2) perché proprio la scadenza; 3) cosa riceverà, in concreto;
// 4) cosa NON faremo; 5) solo alla fine la domanda, compatta.
const MOTIVO: Record<Posizione, (diff: number) => string> = {
  sopra: (d) => `Tra quello che paghi e la media del mercato ci sono ${euro(d)} l'anno.`,
  dentro: () => "Oggi sei in linea. Ma al rinnovo il prezzo può cambiare, e ricontrollarlo prende un minuto.",
  sotto: () => "Oggi paghi poco. Al rinnovo però il prezzo può salire: meglio accorgersene prima di firmare.",
};

function Scadenza({
  cifra,
  forbice,
  pos,
  scadenza,
  setScadenza,
  onAvvisami,
  onSubito,
  onNo,
}: {
  cifra: number;
  forbice: Forbice;
  pos: Posizione;
  scadenza: Scelta | null;
  setScadenza: (s: Scelta) => void;
  onAvvisami: () => void;
  onSubito: () => void;
  onNo: () => void;
}) {
  const { utente } = useUtente();
  const ramo = NOME_RAMO[utente.ramo];
  const oggi = new Date().getMonth();
  // I mesi partono da quello corrente: chi scade a breve lo trova per primo.
  const mesi = Array.from({ length: 12 }, (_, i) => (oggi + i) % 12);
  const vicina = typeof scadenza === "number" && (scadenza === oggi || scadenza === (oggi + 1) % 12);
  const diff = Math.round(cifra - (forbice.min + forbice.max) / 2);
  const meseNotifica = typeof scadenza === "number" ? meseAvviso(scadenza) : "un mese prima";
  const testoNotifica =
    typeof scadenza === "number"
      ? `La tua polizza ${ramo} scade a ${MESI[scadenza]}. Hai un mese per confrontarla con il mercato.`
      : `La tua polizza ${ramo} scade tra un mese. È il momento giusto per confrontarla.`;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-4 px-4 pt-8 pb-8">
        <h1 className="text-[30px] leading-tight font-bold tracking-tight">🔔 Non perdere il momento giusto</h1>
        <p className="rounded-2xl bg-box-giallo px-5 py-4 text-lg leading-snug font-semibold">{MOTIVO[pos](diff)}</p>
        <p className="text-lg leading-snug text-ink/85">
          Una polizza si cambia alla scadenza: prima rischi di pagarne due. E molte si rinnovano da sole se non le
          disdici per tempo. Per questo ti avvisiamo un mese prima.
        </p>

        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold text-muted">Ecco cosa riceverai:</p>
          <div className="flex gap-3 rounded-2xl bg-ink/90 px-4 py-3 text-white shadow-lg">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-kiwi-400 text-xl">🥝</span>
            <span className="flex flex-col">
              <span className="text-sm font-bold">
                Finanz <span className="font-normal text-white/60">· {meseNotifica}</span>
              </span>
              <span className="text-sm leading-snug">{testoNotifica}</span>
            </span>
          </div>
          <p className="text-sm leading-relaxed text-muted">
            Un solo promemoria per questa polizza. Niente chiamate, niente offerte. Lo annulli con un tocco.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-lg font-bold">Quando scade?</p>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="Mese di scadenza">
            {mesi.map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={scadenza === m}
                onClick={() => setScadenza(m)}
                className={`shrink-0 rounded-full border-[1.5px] px-4 py-2 text-sm font-semibold capitalize transition active:scale-95 ${
                  scadenza === m ? "border-forest bg-kiwi-400 text-forest" : "border-line bg-white"
                }`}
              >
                {MESI[m]}
              </button>
            ))}
            <button
              role="radio"
              aria-checked={scadenza === "non_so"}
              onClick={() => setScadenza("non_so")}
              className={`shrink-0 rounded-full border-[1.5px] px-4 py-2 text-sm font-semibold transition active:scale-95 ${
                scadenza === "non_so" ? "border-forest bg-kiwi-400 text-forest" : "border-line bg-white"
              }`}
            >
              Non lo so
            </button>
          </div>
          {scadenza === "non_so" && (
            <p className="rounded-2xl bg-box-azzurro px-4 py-3 text-base leading-relaxed">
              La trovi nel contratto, nell&apos;email di rinnovo o nell&apos;app della tua compagnia. Se vuoi, te lo
              ricordiamo noi tra una settimana.
            </p>
          )}
          {vicina && (
            <p className="rounded-2xl bg-kiwi-100 px-4 py-3 text-base leading-relaxed">
              Scade a breve: sei già nel momento giusto per confrontare.
            </p>
          )}
        </div>
      </div>

      <BottomBar>
        {vicina ? (
          <PrimaryButton onClick={onSubito}>Confronta le offerte adesso</PrimaryButton>
        ) : (
          <PrimaryButton disabled={scadenza === null} onClick={onAvvisami}>
            {scadenza === null
              ? "Scegli il mese di scadenza"
              : scadenza === "non_so"
                ? "Ricordamelo tra una settimana"
                : `Avvisami a ${meseAvviso(scadenza)}`}
          </PrimaryButton>
        )}
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

function Fatto({ scadenza }: { scadenza: Scelta }) {
  const { utente } = useUtente();
  const router = useRouter();
  const ramo = NOME_RAMO[utente.ramo];
  const nota = scadenza === "non_so";
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col items-center gap-4 px-6 pt-12 pb-8 text-center">
        <span className="grid size-28 animate-pop place-items-center rounded-full bg-kiwi-100 text-6xl">🔔</span>
        <h1 className="text-[32px] leading-tight font-bold tracking-tight">
          {nota ? "Te lo ricordiamo tra una settimana" : `Ti avvisiamo a ${meseAvviso(scadenza)}`}
        </h1>
        <p className="text-lg leading-snug text-ink/80">
          {nota
            ? `Ti chiederemo di controllare quando scade la tua polizza ${ramo}, così poi ti avvisiamo al momento giusto.`
            : `Un mese prima della scadenza di ${MESI[scadenza]} ti ricordiamo di confrontare la tua polizza ${ramo}.`}
        </p>
      </div>
      {!nota && (
        <div className="flex flex-col gap-2 px-4">
          <p className="text-sm font-semibold text-muted">Prova il promemoria (nel prototipo arriva subito):</p>
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
      )}
      <BottomBar>
        <PrimaryButton onClick={() => router.push("/")}>Torna alla Home</PrimaryButton>
      </BottomBar>
    </div>
  );
}
