# QATRA compatibility rules

Generated from `backend/app/engine/rules_config.py` (A-03a). Live list: `GET /api/rules`.
Every value comes from the data pack (`data/clean/nt106003_rules.json`, `data/clean/crop_salt_tolerance.csv`). Nothing is decided by AI.

**Count:** analysis 1 · water_limit 22 · crop 2 · use 2 · salinity 7 · **total 34**

## Tunisian law

NT 106.03, Decree 89-1047 and the 21 June 1994 order. A failed rule **blocks** the batch or the farm.

| ID | What it checks | Limit | Severity | Reference | Status |
|---|---|---|---|---|---|
| `R-ANALYSIS` | Required analyses (physico-chemical, parasite eggs) present and still valid | – | block | Decree 89-1047 Art.3 (monitoring frequencies) | REPORTED |
| `R-LIMIT-PH` | pH must be 6.5 - 8.5 | 6.5 – 8.5 | block | NT 106.03 (1989) | REPORTED |
| `R-LIMIT-EC` | EC must be <= 7000 uS/cm | ≤ 7000 uS/cm | block | NT 106.03 (1989) | REPORTED |
| `R-LIMIT-COD` | COD must be <= 90 mg O2/L (24h mean) | ≤ 90 mg O2/L (24h mean) | block | NT 106.03 (1989) | REPORTED |
| `R-LIMIT-BOD5` | BOD5 must be <= 30 mg O2/L (24h mean) | ≤ 30 mg O2/L (24h mean) | block | NT 106.03 (1989) | REPORTED |
| `R-LIMIT-TSS` | TSS must be <= 30 mg/L | ≤ 30 mg/L | block | NT 106.03 (1989) | REPORTED |
| `R-LIMIT-CHLORIDE` | Chloride must be <= 2000 mg/L | ≤ 2000 mg/L | block | NT 106.03 (1989) | REPORTED |
| `R-LIMIT-FLUORIDE` | Fluoride must be <= 3 mg/L | ≤ 3 mg/L | block | NT 106.03 (1989) | REPORTED |
| `R-LIMIT-ORGANOCHLORINES` | Organochlorines must be <= 0.001 mg/L | ≤ 0.001 mg/L | block | NT 106.03 (1989) | REPORTED |
| `R-LIMIT-ARSENIC` | Arsenic must be <= 0.1 mg/L | ≤ 0.1 mg/L | block | NT 106.03 (1989) | REPORTED |
| `R-LIMIT-BORON` | Boron must be <= 3 mg/L | ≤ 3 mg/L | block | NT 106.03 (1989) | REPORTED |
| `R-LIMIT-CADMIUM` | Cadmium must be <= 0.01 mg/L | ≤ 0.01 mg/L | block | NT 106.03 (1989) | REPORTED |
| `R-LIMIT-COBALT` | Cobalt must be <= 0.1 mg/L | ≤ 0.1 mg/L | block | NT 106.03 (1989) | REPORTED |
| `R-LIMIT-CHROMIUM` | Chromium must be <= 0.1 mg/L | ≤ 0.1 mg/L | block | NT 106.03 (1989) | REPORTED |
| `R-LIMIT-COPPER` | Copper must be <= 0.5 mg/L | ≤ 0.5 mg/L | block | NT 106.03 (1989) | REPORTED |
| `R-LIMIT-IRON` | Iron must be <= 5 mg/L | ≤ 5 mg/L | block | NT 106.03 (1989) | REPORTED |
| `R-LIMIT-MANGANESE` | Manganese must be <= 0.5 mg/L | ≤ 0.5 mg/L | block | NT 106.03 (1989) | REPORTED |
| `R-LIMIT-MERCURY` | Mercury must be <= 0.001 mg/L | ≤ 0.001 mg/L | block | NT 106.03 (1989) | REPORTED |
| `R-LIMIT-NICKEL` | Nickel must be <= 0.2 mg/L | ≤ 0.2 mg/L | block | NT 106.03 (1989) | REPORTED |
| `R-LIMIT-LEAD` | Lead must be <= 1 mg/L | ≤ 1 mg/L | block | NT 106.03 (1989) | REPORTED |
| `R-LIMIT-SELENIUM` | Selenium must be <= 0.05 mg/L | ≤ 0.05 mg/L | block | NT 106.03 (1989) | REPORTED |
| `R-LIMIT-ZINC` | Zinc must be <= 5 mg/L | ≤ 5 mg/L | block | NT 106.03 (1989) | REPORTED |
| `R-NEMATODE` | Intestinal nematode (helminth) eggs must be <= 1 egg per litre | ≤ 1 eggs per 1000 mL (<=) | block | NT 106.03 (1989) | REPORTED |
| `R-CROP-ALLOWED` | The crop must be on the list fixed by the 21 June 1994 order (industrial crops, cereals, fodder, fodder shrubs, forest trees; fruit trees only if not sprinkler-irrigated). Olive and alfalfa are allowed by interpretation (TO_VERIFY against the full order). *(to verify: olive, alfalfa)* | – | block | Arrete du Ministre de l'Agriculture du 21 juin 1994 (Decree 89-1047 Art.7) | REPORTED |
| `R-RAW-EATEN` | Vegetable crops (cultures maraicheres) and crops eaten raw (crudites) cannot be irrigated with treated wastewater. | – | block | Decree 89-1047 Art.5 | REPORTED |
| `R-GRAZING` | Direct grazing on plots irrigated with treated wastewater is prohibited. | – | block | Decree 89-1047 Art.6 | REPORTED |
| `R-GRAZING-FODDER` | Fodder crop: cut-and-carry only, no direct grazing. *(to verify: alfalfa)* | – | info | Decree 89-1047 Art.6 | REPORTED |

## Agronomic advice (FAO)

FAO-29 crop salinity thresholds. Not law: a failed rule only adds a **condition**.

| ID | What it checks | Limit | Severity | Reference | Status |
|---|---|---|---|---|---|
| `R-SALINITY-BARLEY` | barley: soil ECe at or above 80% of the FAO-29 crop threshold (8 dS/m, trigger 6.4) risks yield loss; irrigate with a leaching fraction. | ECe 8 dS/m (trigger at 80%: 6.4) | condition | FAO-29 (agronomic guidance) | ESTIMATE |
| `R-SALINITY-WHEAT` | wheat: soil ECe at or above 80% of the FAO-29 crop threshold (6 dS/m, trigger 4.8) risks yield loss; irrigate with a leaching fraction. | ECe 6 dS/m (trigger at 80%: 4.8) | condition | FAO-29 (agronomic guidance) | ESTIMATE |
| `R-SALINITY-ALFALFA` | alfalfa: soil ECe at or above 80% of the FAO-29 crop threshold (2 dS/m, trigger 1.6) risks yield loss; irrigate with a leaching fraction. | ECe 2 dS/m (trigger at 80%: 1.6) | condition | FAO-29 (agronomic guidance) | ESTIMATE |
| `R-SALINITY-LETTUCE` | lettuce: soil ECe at or above 80% of the FAO-29 crop threshold (1.3 dS/m, trigger 1.04) risks yield loss; irrigate with a leaching fraction. | ECe 1.3 dS/m (trigger at 80%: 1.04) | condition | FAO-29 (agronomic guidance) | ESTIMATE |
| `R-SALINITY-TOMATO` | tomato: soil ECe at or above 80% of the FAO-29 crop threshold (2.5 dS/m, trigger 2) risks yield loss; irrigate with a leaching fraction. | ECe 2.5 dS/m (trigger at 80%: 2) | condition | FAO-29 (agronomic guidance) | ESTIMATE |
| `R-SALINITY-CITRUS-ORANGE` | citrus_orange: soil ECe at or above 80% of the FAO-29 crop threshold (1.7 dS/m, trigger 1.36) risks yield loss; irrigate with a leaching fraction. | ECe 1.7 dS/m (trigger at 80%: 1.36) | condition | FAO-29 (agronomic guidance) | ESTIMATE |
| `R-SALINITY-BARLEY-FODDER` | barley_fodder: soil ECe at or above 80% of the FAO-29 crop threshold (6 dS/m, trigger 4.8) risks yield loss; irrigate with a leaching fraction. | ECe 6 dS/m (trigger at 80%: 4.8) | condition | FAO-29 (agronomic guidance) | ESTIMATE |

Crops with no FAO-29 threshold (olive, pomegranate, oat fodder) get one result `R-SALINITY-NONE`, severity info, passed: *No FAO salinity threshold for this crop — salinity not assessed.*

## Removed on purpose

- **Faecal coliforms:** NT 106.03 sets no coliform limit (it only regulates nematode eggs). The WHO value (1000 CFU/100 mL) is not Tunisian law, so it is not a rule.
- **Estimated or missing salinity thresholds:** olive and pomegranate (4.0 dS/m, ESTIMATE / TO_VERIFY) and oat fodder (no threshold).
- **General water salinity** (FAO-29 Table 1, ECw > 3.0 dS/m): not a crop threshold. 58 of 60 demo batches are above it.

## Notes for Q&A

- **Analyses:** physico-chemical valid 30 days (monthly), parasite eggs 15 days, metals 6 months (Decree 89-1047 Art.3). No metals analysis is a warning, not a block.
- **EC unit:** NT 106.03 gives 7000 µS/cm = 7 dS/m; batch values are in dS/m.
- **Metals and other NT parameters** (fluoride, organochlorines, As … Zn) have a legal limit but no column in the batch data. They are evaluated only when a metals analysis exists.
- **Crop list:** from the 21 June 1994 order as summarised by Benabdallah (2003), a secondary source. Olive and alfalfa are allowed by interpretation (fruit tree, fodder); to verify against the full order. Fruit trees only if not sprinkler-irrigated.
- **Grazing:** the farm data has no land-use field, so every farm is assumed to have no direct grazing. Fodder crops get an info note: cut-and-carry only.
- **Demo check** (batch SSUD-20260708): Farm A alfalfa → conditional (soil ECe 1.9 ≥ 1.6), Farm B olive → compatible, Farm C lettuce → blocked (eaten raw, not on the crop list).
- **Not in the rules:** sprinkler distance from roads and wells (Art.10 gives no distance) and the 1995 cahier des charges (text not found).
