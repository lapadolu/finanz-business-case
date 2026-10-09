"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUtente } from "@/components/Providers";
import { BottomBar, ChipStato, Icona, PrimaryButton, SecondaryButton, TastoTondo } from "@/components/ui";
import { NOME_RAMO } from "@/lib/utenti";
import { MESI } from "@/lib/mercato";

// Dove porta il promemoria, un mese prima della scadenza (simulato: nel prototipo ci arrivi subito).
// È il momento giusto per chi ha già una polizza: può cambiare senza pagare due volte.
export default function Promemoria() {
  const { utente, progresso, track } = useUtente();
  const router = useRouter();
  const tracciato = useRef(false);
  const ramo = NOME_RAMO[utente.ramo];
  const mese = progresso.scadenza !== undefined ? MESI[progresso.scadenza] : "il prossimo mese";

  useEffect(() => {
    if (tracciato.current) return;
    tracciato.current = true;
    track("Renewal Reminder Opened");
  }, [track]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-4 py-4">
        <TastoTondo label="Chiudi" onClick={() => router.push("/")}>
          <Icona nome="x" size={22} />
        </TastoTondo>
        <ChipStato serie={false} />
      </div>
      <div className="flex flex-col gap-5 px-4 pt-4 pb-8">
        <p className="self-start rounded-full bg-box-giallo px-3 py-1 text-sm">Simulazione: un mese prima della scadenza</p>
        <h1 className="text-[34px] leading-tight font-bold tracking-tight">🗓️ La tua polizza {ramo} scade a {mese}</h1>
        <p className="text-lg leading-snug font-semibold">
          È il momento in cui puoi cambiare senza pagare due volte. Prima di rinnovare, ricontrolla la tua polizza.
        </p>
        <p className="rounded-2xl bg-box-azzurro px-6 py-4 text-lg leading-relaxed">
          Il prezzo del rinnovo, la franchigia e il massimale. Poi guarda le esclusioni, in fondo al contratto.
        </p>
        <p className="rounded-2xl bg-box-giallo px-6 py-4 text-lg leading-relaxed">
          Se vuoi, confronta le offerte di altre compagnie con coperture simili. È gratis e non ti impegna.
        </p>
        <p className="text-sm leading-relaxed text-muted">
          Finanz non è un intermediario assicurativo e non ti consiglia una polizza specifica. Il confronto è offerto da un
          partner iscritto al Registro Unico degli Intermediari (RUI).
        </p>
      </div>
      <BottomBar>
        <PrimaryButton
          onClick={() => {
            track("Partner CTA Clicked", { from: "promemoria" });
            router.push("/comparatore");
          }}
        >
          Confronta le offerte
        </PrimaryButton>
        <SecondaryButton onClick={() => router.push("/")}>Per ora va bene così</SecondaryButton>
      </BottomBar>
    </div>
  );
}
