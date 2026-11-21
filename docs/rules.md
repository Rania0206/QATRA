# QATRA compatibility rules

Generated from `backend/app/engine/rules_config.py` (A-03a). Live list: `GET /api/rules`.
Every value comes from the data pack (`data/clean/nt106003_rules.json`, `irrigation_water_quality_guidelines.csv`, `crop_salt_tolerance.csv`). Nothing is decided by AI.

- **Legal** rules (NT 106.03, Decree 89-1047, 1994 order) **block** a batch or a farm.
- **Agronomic** rules (FAO-29 salinity) only add a **condition**.
- **WHO** coliform guidance is **not Tunisian law**: condition only, tagged TO_VERIFY.

**Count:** analysis 1 · water_limit 23 · crop 2 · use 2 · salinity 11 · **total 39**

| ID | What it checks | Limit | Severity | Legal reference | Status |
|---|---|---|---|---|---|
| `R-ANALYSIS` | Required analyses (physico-chemical, parasite eggs) must be present and still valid (Batch.analysis_status = valid). Art.3a: pH, BOD5, COD, TSS, chloride, sodium, ammonium-N, electrical conductivity at least once per month; Art.3b: As, B, Cd, Cr, Co, Cu, Fe, fluoride, Mn, Hg, Ni, organochlorines, Se, Pb, Zn at least once per semester; Art.3c: parasite eggs once every 15 days. | – | block | Decree 89-1047 Art.3 (monitoring frequencies) | REPORTED |
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
| `R-COLIFORM` | Faecal coliforms above 1000 CFU/100 mL: WHO guideline — not Tunisian law. Irrigation allowed only with health-protection conditions. | ≤ 1000 CFU/100 mL | condition | WHO 2006 guidelines (not Tunisian law; NT 106.03 sets no coliform limit) | TO_VERIFY |
| `R-CROP-ALLOWED` | The crop must be on the list fixed by the 21 June 1994 order (industrial crops, cereals, fodder, fodder shrubs, forest trees; fruit trees only if not sprinkler-irrigated). Olive and alfalfa are allowed by interpretation (TO_VERIFY against the full order). *(to verify: olive, alfalfa)* | – | block | Arrete du Ministre de l'Agriculture du 21 juin 1994 (Decree 89-1047 Art.7) | REPORTED |
| `R-RAW-EATEN` | Vegetable crops (cultures maraicheres) and crops eaten raw (crudites) cannot be irrigated with treated wastewater. | – | block | Decree 89-1047 Art.5 | REPORTED |
| `R-GRAZING` | Direct grazing on plots irrigated with treated wastewater is prohibited. | – | block | Decree 89-1047 Art.6 | REPORTED |
| `R-GRAZING-FODDER` | Fodder crop: cut-and-carry only, no direct grazing. *(to verify: alfalfa)* | – | info | Decree 89-1047 Art.6 | REPORTED |
| `R-SALINITY-WATER` | Water EC above 3 dS/m is a severe salinity risk (FAO-29): irrigate with a leaching fraction and watch soil salinity. | ≤ 3 dS/m | condition | FAO-29 (agronomic guidance) | ESTIMATE |
| `R-SALINITY-BARLEY` | barley: soil ECe at or above 80% of the crop threshold (8.0 dS/m, trigger 6.4) risks yield loss; irrigate with a leaching fraction. | ECe threshold 8 dS/m (trigger at 80%: 6.4) | condition | FAO-29 (agronomic guidance) | ESTIMATE |
| `R-SALINITY-WHEAT` | wheat: soil ECe at or above 80% of the crop threshold (6.0 dS/m, trigger 4.8) risks yield loss; irrigate with a leaching fraction. | ECe threshold 6 dS/m (trigger at 80%: 4.8) | condition | FAO-29 (agronomic guidance) | ESTIMATE |
| `R-SALINITY-ALFALFA` | alfalfa: soil ECe at or above 80% of the crop threshold (2.0 dS/m, trigger 1.6) risks yield loss; irrigate with a leaching fraction. | ECe threshold 2 dS/m (trigger at 80%: 1.6) | condition | FAO-29 (agronomic guidance) | ESTIMATE |
| `R-SALINITY-LETTUCE` | lettuce: soil ECe at or above 80% of the crop threshold (1.3 dS/m, trigger 1.04) risks yield loss; irrigate with a leaching fraction. | ECe threshold 1.3 dS/m (trigger at 80%: 1.04) | condition | FAO-29 (agronomic guidance) | ESTIMATE |
| `R-SALINITY-TOMATO` | tomato: soil ECe at or above 80% of the crop threshold (2.5 dS/m, trigger 2) risks yield loss; irrigate with a leaching fraction. | ECe threshold 2.5 dS/m (trigger at 80%: 2) | condition | FAO-29 (agronomic guidance) | ESTIMATE |
| `R-SALINITY-CITRUS-ORANGE` | citrus_orange: soil ECe at or above 80% of the crop threshold (1.7 dS/m, trigger 1.36) risks yield loss; irrigate with a leaching fraction. | ECe threshold 1.7 dS/m (trigger at 80%: 1.36) | condition | FAO-29 (agronomic guidance) | ESTIMATE |
| `R-SALINITY-OLIVE` | olive: soil ECe at or above 80% of the crop threshold (4.0 dS/m, trigger 3.2) risks yield loss; irrigate with a leaching fraction. | ECe threshold 4 dS/m (trigger at 80%: 3.2) | condition | FAO-29 (agronomic guidance) | TO_VERIFY |
| `R-SALINITY-POMEGRANATE` | pomegranate: soil ECe at or above 80% of the crop threshold (4.0 dS/m, trigger 3.2) risks yield loss; irrigate with a leaching fraction. | ECe threshold 4 dS/m (trigger at 80%: 3.2) | condition | FAO-29 (agronomic guidance) | TO_VERIFY |
| `R-SALINITY-OAT-FODDER` | oat_fodder: soil ECe at or above 80% of the crop threshold (not established dS/m, trigger unknown) risks yield loss; irrigate with a leaching fraction. | **none in data** | condition | FAO-29 (agronomic guidance) | TO_VERIFY |
| `R-SALINITY-BARLEY-FODDER` | barley_fodder: soil ECe at or above 80% of the crop threshold (6.0 dS/m, trigger 4.8) risks yield loss; irrigate with a leaching fraction. | ECe threshold 6 dS/m (trigger at 80%: 4.8) | condition | FAO-29 (agronomic guidance) | ESTIMATE |

## Notes for Q&A

- **Analyses:** physico-chemical valid 30 days (monthly), parasite eggs 15 days, metals 6 months (Decree 89-1047 Art.3). Missing metals is a warning, not a block (A-02).
- **EC unit:** NT 106.03 gives 7000 µS/cm = 7 dS/m; batch values are in dS/m.
- **Metals and other NT parameters** (fluoride, organochlorines, As … Zn) have a legal limit but no column in the batch data. They are evaluated only when a metals analysis exists.
- **Faecal coliforms:** NT 106.03 sets no limit (it only regulates nematode eggs). 1000 CFU/100 mL is a WHO-derived design value.
- **Crop list:** from the 21 June 1994 order as summarised by Benabdallah (2003), a secondary source. Olive and alfalfa are allowed by interpretation (fruit tree, fodder); to verify against the full order. Fruit trees only if not sprinkler-irrigated.
- **Grazing:** the farm data has no land-use field, so every farm is assumed to have no direct grazing. Fodder crops get an info note: cut-and-carry only.
- **Salinity:** the data has soil ECe thresholds per crop but **no per-crop water (ECw) tolerance**, so the water check uses the general FAO-29 class (ECw > 3.0 dS/m = severe).
- **Not in the rules:** sprinkler distance from roads and wells (Art.10, no distance in the text) and the 1995 cahier des charges (text not found, TO_VERIFY).
