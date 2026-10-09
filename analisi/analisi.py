"""
Finanz · Percorso Assicurazioni — analisi dell'export Mixpanel.
Ricostruisce tutti i numeri del documento. Uso: python analisi.py export_mixpanel_assicurazioni.xlsx
"""
import re, sys
import pandas as pd

FILE = sys.argv[1] if len(sys.argv) > 1 else "export_mixpanel_assicurazioni.xlsx"
PAYOUT = {"rc_auto": 45, "casa": 40, "salute": 75, "vita": 80, "dentale": 35}
RAMI = {"rc_auto": "rc_auto", "rc auto": "rc_auto", "salute": "salute", "vita": "vita", "vita_tcm": "vita",
        "casa": "casa", "dentale": "dentale", "dental": "dentale"}
INTENTO = {"Sì, ne ho già una o più": "ha già", "No, ma sto pensando di farne una": "ci pensa", "No": "no"}

# 1. Pulizia
raw = pd.read_excel(FILE, sheet_name="export")
ev = raw.drop_duplicates("$insert_id")
print("Righe grezze", len(raw), "| duplicati", len(raw) - len(ev))
print("Varianti di 'ramo':", raw.ramo.nunique())
ev = ev.assign(ramo_n=ev.ramo.str.strip().str.lower().map(RAMI))
test = ev[~ev.distinct_id.str.fullmatch(r"[0-9a-f]{12,16}")]
print("Account di test:", sorted(test.distinct_id.unique()), "| polizze di test:", (test.event == "Policy Activated").sum())
ev = ev.drop(test.index)

# 2. Una riga per utente, con il primo momento di ogni step
u = ev[ev.event == "Path Started"].groupby("distinct_id").first()[["time", "$os", "$app_version_string", "ramo_n", "onboarding_intent"]]
def primo(nome, filtro=None):
    d = ev[ev.event == nome]
    if filtro is not None:
        d = d[filtro(d)]
    return d.groupby("distinct_id").time.min()
for i in range(1, 5):
    u[f"L{i}"] = primo("Lesson Completed", lambda d, i=i: d.lesson_number == i)
for nome, col in [("Quiz Completed", "quiz"), ("Path Completed", "fine"), ("Partner Screen Viewed", "schermata"),
                  ("Partner CTA Clicked", "click"), ("Quote Requested", "preventivo"), ("Policy Activated", "polizza")]:
    u[col] = primo(nome)
u["score"] = ev[ev.event == "Quiz Completed"].groupby("distinct_id").quiz_score.max()
u["intento"] = u.onboarding_intent.map(INTENTO).fillna("non risposto")
u["payout"] = u.ramo_n.map(PAYOUT)
u["ricavo"] = u.payout.where(u.polizza.notna(), 0)

# 3. Funnel
STEP = ["L1", "L2", "L3", "L4", "quiz", "fine", "schermata", "click", "preventivo", "polizza"]
print("\nFunnel (utenti unici):", len(u), "avvii")
prima = len(u)
for s in STEP:
    n = u[s].notna().sum()
    print(f"  {s:11s}{n:6d}  {n/prima:6.1%} dal passo prima  {n/len(u):6.1%} dall'avvio")
    prima = n

# 4. Schermata partner per risposta all'onboarding
s = u[u.schermata.notna()]
t = s.groupby("intento").agg(vedono=("schermata", "size"), click=("click", "count"), preventivi=("preventivo", "count"),
                             polizze=("polizza", "count"), ricavi=("ricavo", "sum"))
t["% click"] = t.click / t.vedono
t["% prev. su click"] = t.preventivi / t.click
t["€ per chi vede"] = t.ricavi / t.vedono
print("\nSchermata partner per intento\n", t.round(3))
print("\nClick per punteggio del quiz\n", s.groupby("score").click.apply(lambda x: x.notna().mean()).round(3))
print("Secondi tra schermata e click (max):", ((s.click - s.schermata).dt.total_seconds()).max().round())
print("Giorni tra preventivo e polizza (min-max):",
      ((u.polizza - u.preventivo).dt.total_seconds() / 86400).agg(["min", "max"]).round(1).to_dict())

# 5. Bug Android 4.12.0
bug = (u["$os"] == "Android") & (u["$app_version_string"] == "4.12.0")
for nome, g in [("Android 4.12.0", u[bug]), ("tutti gli altri", u[~bug])]:
    print(f"L2→L3 {nome}: {g.L3.notna().sum() / g.L2.notna().sum():.1%}")
atteso = u[bug].L2.notna().sum() * u[~bug].L3.notna().sum() / u[~bug].L2.notna().sum()
persi = atteso - u[bug].L3.notna().sum()
valore_l3 = u[~bug & u.L3.notna()].ricavo.mean()
print(f"Utenti persi alla lezione 3: {persi:.0f} → circa {persi*valore_l3:.0f} € ({valore_l3:.2f} € per utente arrivato in lezione 3)")

# 6. Quanto vale
print("\nRicavi per ramo\n", u[u.polizza.notna()].groupby("ramo_n").payout.agg(["size", "sum"]))
print("Totale:", u.ricavo.sum(), "€ su", u.polizza.notna().sum(), "polizze")
gap = t.loc["ha già", "vedono"] * (t.loc["ci pensa", "€ per chi vede"] - t.loc["ha già", "€ per chi vede"])
print(f"Costo massimo del collo di bottiglia: {gap:.0f} € a trimestre")
payout_medio = t.loc["ha già", "ricavi"] / t.loc["ha già", "polizze"]
for nome, catena in {"prudente": [.20, .60, .40, .30, .46, .28], "base": [.30, .70, .40, .40, .46, .28],
                     "ottimista": [.40, .80, .60, .50, .46, .35]}.items():
    x = t.loc["ha già", "vedono"]
    for p in catena:
        x *= p
    print(f"Feature, scenario {nome}: {x:.1f} polizze in più → {x*payout_medio:.0f} € a trimestre")
