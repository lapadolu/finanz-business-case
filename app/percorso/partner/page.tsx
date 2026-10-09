"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUtente } from "@/components/Providers";
import { BottomBar, ChipStato, Icona, PrimaryButton, SecondaryButton, TastoTondo } from "@/components/ui";
import { NOME_RAMO, type Ramo } from "@/lib/utenti";
import { haPolizza } from "@/lib/mercato";

const OGGETTO: Partial<Record<Ramo, string>> = { casa: "casa del tuo immobile" };
const AVVISO: Partial<Record<Ramo, string>> = { vita: "Ti chiederemo anche qualche dato sulla tua salute." };

// La schermata dopo il percorso.
// Versione "oggi": il comparatore per tutti.
// Versione "nuova": chi ha già una polizza riceve prima il confronto della sua polizza col mercato;
// chi non ce l'ha vede il comparatore come oggi.
export default function SchermataPartner() {
  const { utente, progresso, variante, track } = useUtente();
  const tracciato = useRef(false);
  const flussoNuovo = variante === "nuova" && haPolizza(utente.onboarding_intent, progresso.premio);

  useEffect(() => {
    if (tracciato.current) return;
    tracciato.current = true;
    track("Partner Screen Viewed", { screen: flussoNuovo ? "confronta_polizza" : "comparatore" });
  }, [track, flussoNuovo]);

  return flussoNuovo ? <ConfrontaLaTua /> : <Comparatore />;
}

function Testata() {
  const router = useRouter();
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-4 py-4">
      <TastoTondo label="Chiudi" onClick={() => router.push("/")}>
        <Icona nome="x" size={22} />
      </TastoTondo>
      <ChipStato serie={false} />
    </div>
  );
}

function NotaLegale() {
  return (
    <p className="text-sm leading-relaxed text-muted">
      Finanz non è un intermediario assicurativo e non ti consiglia una polizza specifica. Il confronto è offerto da un
      partner iscritto al Registro Unico degli Intermediari (RUI).
    </p>
  );
}

function ConfrontaLaTua() {
  const { utente, track } = useUtente();
  const router = useRouter();
  const ramo = NOME_RAMO[utente.ramo];

  return (
    <div className="flex flex-1 flex-col">
      <Testata />
      <div className="flex flex-col gap-5 px-4 pt-4 pb-8">
        <h1 className="text-[34px] leading-tight font-bold tracking-tight">🔍 Metti alla prova la tua polizza</h1>
        <p className="text-lg leading-snug font-semibold">
          Ora sai leggere una polizza. Prova con la tua {ramo}: vedi dove si posiziona rispetto al mercato, a parità di
          coperture.
        </p>
        <p className="rounded-2xl bg-box-azzurro px-6 py-4 text-lg leading-relaxed">
          Tre domande, un minuto. Non ti chiediamo nome, email o targa.
        </p>
        <p className="rounded-2xl bg-box-giallo px-6 py-4 text-lg leading-relaxed">
          Ti mostriamo i numeri, la conclusione la tiri tu.
        </p>
        <NotaLegale />
      </div>
      <BottomBar>
        <PrimaryButton
          onClick={() => {
            track("Policy Check Started");
            router.push("/percorso/confronta");
          }}
        >
          Confronta la mia polizza
        </PrimaryButton>
        <button
          onClick={() => {
            track("Partner CTA Clicked", { from: "confronta_polizza" });
            router.push("/comparatore");
          }}
          className="py-1 text-base font-semibold text-forest underline"
        >
          Sta per scadere: voglio subito i preventivi
        </button>
        <SecondaryButton onClick={() => router.push("/")}>Torna alla Home</SecondaryButton>
      </BottomBar>
    </div>
  );
}

// La schermata di oggi, invariata.
function Comparatore() {
  const { utente, track } = useUtente();
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col">
      <Testata />
      <div className="flex flex-col gap-5 px-4 pt-4 pb-8">
        <h1 className="text-[34px] leading-tight font-bold tracking-tight">🛡️ Trova la tua polizza</h1>
        <p className="text-lg leading-snug font-semibold">
          Confronta in pochi minuti le offerte di tante compagnie per la polizza{" "}
          {OGGETTO[utente.ramo] ?? NOME_RAMO[utente.ramo]}.
        </p>
        <p className="rounded-2xl bg-box-azzurro px-6 py-4 text-lg leading-relaxed">
          Un solo modulo, tanti preventivi. Vedi prezzi, massimali e franchigie uno accanto all&apos;altro.
        </p>
        <p className="rounded-2xl bg-box-giallo px-6 py-4 text-lg leading-relaxed">
          Il confronto è gratis e non ti impegna. {AVVISO[utente.ramo]}
        </p>
        <NotaLegale />
      </div>
      <BottomBar>
        <PrimaryButton
          onClick={() => {
            track("Partner CTA Clicked");
            router.push("/comparatore");
          }}
        >
          Confronta le polizze
        </PrimaryButton>
        <SecondaryButton onClick={() => router.push("/")}>Torna alla Home</SecondaryButton>
      </BottomBar>
    </div>
  );
}
