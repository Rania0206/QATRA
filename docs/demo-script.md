# QATRA demo script (about 8 minutes)

One story, one thread: **safe water → who gets it → what it saves → what it could become → where every number comes from.**
Replace `<app>` with the address you run, for example `http://localhost:5173`.

All numbers below were read from the running system on the default plan (21 Nov 2026 forecast day, batch SSUD-20260829). If a number on screen differs, say the number on screen.

---

## Before you start (2 minutes, not in front of the jury)

1. Start the backend **without `--reload`** (it hangs on Windows): `cd backend && ..\.venv\Scripts\uvicorn app.main:app --port 8000`.
2. Start the frontend: `cd frontend && npm run dev`. Open `<app>`.
3. Clear the browser's saved farm code and language (DevTools, Application, Local Storage, delete `qatra.farm` and `qatra.lang`). Set the language to **EN**.
4. Open these tabs in order: Compatibility (operator), Allocation (operator), Savings (farm B), Business, Impact, Sources. Check none shows an error box.
5. Know the fallback: `npm run dev:mocks` runs everything from saved sample answers, with no backend. The figures are the same; editing a price no longer changes them.
6. The Demo role box in the header is a demo switch, not a login. Leave it on **All sections** unless you want the role story (see the end).

---

## The menu follows the story

Open the full-screen menu (the three lines, top left). The tabs are listed in the order of this script, so you can go straight down the list:

| Menu | Tab | Script step |
|---|---|---|
| 01 | Batches | The water itself (optional first look) |
| 02 | Compatibility | Step 1 |
| 03 | Allocation | Step 2 |
| 04 | Savings | Step 3 |
| 05 | Business | Step 4 |
| 06 | Impact | Step 5 |
| 07 | Sources | Step 6 |
| 08 to 12 | Heatwave, Soil, Messages, Requests, Map | Backups (see below) |

A Demo role lists only its own tabs, in the same order.

---

## The run of show

### 0. Opening (30 s). No screen yet
Say: *"In Tunisia only about 4 percent of treated wastewater is used in farming. Farmers pump expensive well water while treated water is wasted, mostly because nobody can say, farm by farm, whether it is safe. QATRA answers four questions: is it safe, who gets how much, what does it save, and what could it become."*

### 1. Is it safe? Compatibility, operator view (45 s)
- **Open:** `<app>/#/compatibility?view=operator`
- **Click:** farm **C** (lettuce), then farm **A**.
- **Say:** "The rules come from Tunisian law (NT 106.03, Decree 89-1047, the 1994 order). **8 farms can irrigate, 1 with care, 1 cannot.** Lettuce is eaten raw, so the law forbids this water. Farm A is allowed with care because its soil is salty."
- **Two numbers to say:** 8 / 1 / 1 and 34 rules.
- **If it breaks:** show farm C's card alone (`#/compatibility?farm=C`) and say the verdict in words.

### 2. Who gets how much, and the power cut. Allocation, operator view (90 s)
- **Open:** `<app>/#/allocation?view=operator`
- **Say first (normal day):** "Today the plant shares **799.3 m³** between 9 farms, **41 percent of the pumping energy is solar**, and farmers save **97 TND a day**. Farm C gets 0."
- **Click:** under "Try the demo", **Heatwave day (26 Aug)**, then **Power cut**.
- **Point at:** the red band 13:00 to 17:00 on the chart. "The pump never uses the grid during the cut. It runs on the sun only, at a lower flow."
- **Two numbers to say:** 79 percent solar and 1,125.5 m³ on the heatwave day. Then click **Normal day** to show it switch back.
- **If it breaks:** use the default day only and read the chart caption ("Solar covers 41% of the pumping energy").

### 3. What a farmer sees. Savings, farm B, then Arabic (75 s)
- **Open:** `<app>/#/savings?farm=B` (this is the SMS link a farmer would get).
- **Say:** "A farmer sees only his own farm. Farm B saves about **1,157 TND this season**. That is 960 TND of pumping electricity, plus 551 TND of fertiliser already in the water, minus 225 TND for the water. QATRA keeps 10 percent."
- **Click:** open **Change the prices**, set the fertiliser price to **2**, watch the number move to **1,653 TND**, press **Reset to default** (back to 1,157).
- **Switch to AR** with the language switch, then open `<app>/#/compatibility?farm=B`. Say: "Same farm in Arabic, right to left."
- **Two numbers to say:** 1,157 TND per season (97 TND a day for all farms), 10 percent.
- **If it breaks:** open "How we calculated" and read the assumptions aloud.

### 4. What it could become. Business (60 s)
- **Open:** `<app>/#/territory` (menu: **Business**).
- **Click:** **Equipped for treated water (7,819 ha)**. The slider stays at **30 percent**.
- **Say:** "If treated water reached the 7,819 hectares already equipped in Tunisia, and 30 percent of them joined, farmers would keep about **1,089,507 TND a year** and QATRA would earn about **121,015 TND**. QATRA earns only when farmers save: 10 percent of their saving. Farmers pay nothing upfront. This is a projection."
- **Two numbers to say:** 1,089,507 TND and 121,015 TND a year.
- **If it breaks:** use **Irrigated (2,778 ha)**: 387,089 TND for farmers, 42,995 TND for QATRA.

### 5. The summary. Impact (30 s)
- **Open:** `<app>/#/impact`
- **Read the headline:** "In our pilot, 10 farms save about 97 TND a day and replace 799.3 m³ of fresh water."
- **Two numbers to say:** 97 TND a day and 14,585 TND a season. The same figures are on Savings and Allocation.
- **If it breaks:** skip to step 6.

### 6. Where every number comes from. Sources (45 s)
- **Open:** `<app>/#/public` (menu: **Sources**).
- **Say:** "Every number carries a tag. 7,819 hectares is **reported**, from L'Économiste Maghrébin, September 2026. The fertiliser price and the treated-water price are **to be verified**, and they are highlighted. We do not hide them."
- **Two numbers to say:** 2 prices to verify, 7,819 ha reported.
- **If it breaks:** say the tag legend aloud (reported, estimate, simulated, projection, to be verified).

### 7. Close (20 s)
Say: *"Safe by law, shared fairly, powered by the sun when the grid fails, and worth about 97 dinars a day to ten farms already. The demo farms are simulated on real fields. With real lab data and a real farm list, the same engine gives real numbers."*

---

## Optional backups (use if a judge asks, or time remains)

| Question | Open | What to say |
|---|---|---|
| "What does a power cut do without QATRA?" | `#/heatwave` | On 26 Aug the usual policy leaves **4 hours without water (117.4 m³ unserved)**; QATRA leaves **0**. (This tab uses its own hourly model, so its volumes differ from Allocation. Do not mix the two.) |
| "Will my soil survive?" | `#/soil?farm=B` | The 30-year salt build-up, usual irrigation against QATRA's managed irrigation. |
| "How does a farmer get told?" | `#/messages` | The SMS text, in French and Tunisian Arabic, with quick replies 1 to 4. The Arabic still needs a Tunisian speaker's review. |
| "Who approves a farm's request?" | `#/requests?role=gda` then `#/requests?role=crda` | GDA sends a request, CRDA approves or rejects it. A decision is final. |
| "Where is everything?" | `#/map` | Plants, irrigated area, farmland, basin. Farmers see only their own farm. |

## The role story (optional, 60 s)
Use the **Demo role** box in the header. It is a demo switch, not a login: it opens that role's first tab and lists only its tabs.
**ONAS** (plant operator) opens Batches and gets all-farms views. **CRDA** opens Compatibility. **GDA** sends water requests. **Public** sees only Impact and Sources.
Choose **All sections** to see everything again. Say plainly that real access control needs a login.

---

## Questions the jury may ask (short, honest answers)

- **Is the data real?** The farms, batches, pumps, outage windows and phone numbers are simulated on real farmland. Hectares, legal limits, tariffs and weather are reported figures. Everything is tagged.
- **Which prices are assumed?** Fertiliser 1.0 TND per kg and treated water 0.020 TND per m³, both to be verified. Electricity uses STEG's average price, not the agricultural tariff.
- **Is there enough treated water for 7,819 ha?** Not checked. The scale-up is a projection and says so.
- **Does QATRA make a profit?** We show revenue only, 10 percent of the saving. We have no cost data, so no profit figure.
- **Why is farm C at zero?** Lettuce is eaten raw, and Decree 89-1047 article 5 forbids irrigating it with treated wastewater.
- **Is it safe to use a farmer's code?** The code only selects the farm in the demo. Real privacy needs a login and a per-farm endpoint, which is the next version.
- **Where does the weather come from?** Saved files from Open-Meteo (forecast) and NASA POWER (summer 2026 and 30 years). The platform does not call a live weather service.

## If everything breaks
Run `npm run dev:mocks` in the frontend folder. No backend is needed. Say: "This is the same screens running from saved sample answers."

## Things not to click live
- Requests tab at 360 px width (it is slightly wider than a phone).
- The Messages SMS says "1156,5 TND" while Savings says "1,157": the same figure, rounded differently.
- Farm names and dataset sources stay in French or English in Arabic, because they come from the data.
