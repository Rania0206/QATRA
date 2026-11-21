"""Modules 1.2, 1.3, 2.2, 2.3, 4.2, 4.3, 5, 6, 8, 9 - reference tables transcribed from cited public documents.

Every row carries status + source. Values transcribed from published tables are REPORTED;
generic literature ranges are ESTIMATE; anything unconfirmed is TO_VERIFY.
Re-run: py -3.13 scripts/05_build_reference.py
"""
import json
import pandas as pd
from common import *

ENV_PDF = "https://www.environnement.gov.tn/fileadmin/Bibliotheque/Projets_acheves/PISEAU_II/Programmes_formation-sensibilisation/Presentation_EIE.pdf"
ETHZ = "https://www.files.ethz.ch/isn/27892/2003-11.pdf"
DECREE = "https://faolex.fao.org/docs/pdf/tun204032.pdf"
FAO56 = "https://www.fao.org/4/x0490e/x0490e00.htm"
FAO29 = "https://www.fao.org/4/t0234e/t0234e00.htm"
WHO06 = "https://www.who.int/publications/i/item/9241546832"

# ---------------------------------------------------------------- 6.1 NT 106.03
def nt106003():
    S1 = f"Ministere de l'Environnement (TN), 'Presentation_EIE.pdf', p.13 'Normes Tunisiennes pour la reutilisation des eaux traitees (NT 106.03:1989)' - {ENV_PDF}"
    S2 = f"Benabdallah S. (2003) 'La reutilisation des eaux usees traitees en Tunisie', Tableau 10 p.15 - {ETHZ}"
    rows = [("pH", "6.5 - 8.5", "-", S1), ("EC", 7000, "uS/cm", S2), ("COD", 90, "mg O2/L (24h mean)", S1),
            ("BOD5", 30, "mg O2/L (24h mean)", S1), ("TSS", 30, "mg/L", S1), ("Chloride", 2000, "mg/L", S1),
            ("Fluoride", 3, "mg/L", S1), ("Organochlorines", 0.001, "mg/L", S1), ("Arsenic", 0.1, "mg/L", S1),
            ("Boron", 3, "mg/L", S1), ("Cadmium", 0.01, "mg/L", S1), ("Cobalt", 0.1, "mg/L", S1),
            ("Chromium", 0.1, "mg/L", S1), ("Copper", 0.5, "mg/L", S1), ("Iron", 5, "mg/L", S1),
            ("Manganese", 0.5, "mg/L", S1), ("Mercury", 0.001, "mg/L", S1), ("Nickel", 0.2, "mg/L", S1),
            ("Lead", 1, "mg/L", S1), ("Selenium", 0.05, "mg/L", S1), ("Zinc", 5, "mg/L", S1),
            ("Intestinal nematode eggs (helminths)", 1, "eggs per 1000 mL (<=)", S1)]
    params = [{"parameter": p, "limit": v, "unit": u, "source": s, "status": "REPORTED"} for p, v, u, s in rows]
    params.append({"parameter": "Faecal coliforms", "limit": None, "unit": "CFU/100 mL",
                   "source": f"{S2} (states NT 106.03 only regulates nematode eggs microbiologically)",
                   "status": "REPORTED (no limit in NT 106.03)",
                   "who_2006_reference": "WHO 2006: E. coli <=1e3-1e4 /100 mL depending on crop/exposure (restricted irrigation ~ <=1e4-1e5 with health-protection measures); TO_VERIFY exact table",
                   "fallback_used_by_engine": 1000, "fallback_status": "TO_VERIFY (WHO-derived design value, not Tunisian law)"})
    return {
        "standard": "NT 106.03 (1989) - Tunisian standard for agricultural reuse of treated wastewater",
        "note": "A revision of the reuse regulation and a decree classifying TWW quality by use are reported as in preparation (2026 press); values below are the 1989 standard.",
        "parameters": params,
        "decree_89_1047": {
            "title": "Decret n. 89-1047 du 28 juillet 1989 fixant les conditions d'utilisation des eaux usees traitees a des fins agricoles (JORT n.55, 11-15 aout 1989, p.1218); modifie par decret n. 93-2447 du 13 decembre 1993",
            "source": DECREE, "status": "REPORTED",
            "authorisation": "Art.1: authorisation by Minister of Agriculture after agreement of Public Health (and environment authority).",
            "monitoring_frequency": [
                {"what": "pH, BOD5, COD, TSS, chloride, sodium, ammonium-N, electrical conductivity", "frequency": "at least once per month", "sample": "24h composite", "article": "Art.3a"},
                {"what": "As, B, Cd, Cr, Co, Cu, Fe, fluoride, Mn, Hg, Ni, organochlorines, Se, Pb, Zn", "frequency": "at least once per semester", "sample": "24h composite", "article": "Art.3b"},
                {"what": "parasite eggs", "frequency": "once every 15 days", "sample": "24h composite", "article": "Art.3c"}],
            "forbidden": ["Art.5: irrigation of vegetable crops (cultures maraicheres) and crops eaten raw (crudites) is forbidden",
                          "Art.6: direct grazing on TWW-irrigated plots is prohibited"],
            "conditions": ["Art.7: only crops whose products are not directly consumed by humans (list fixed by arrete of Min. Agriculture); no other crop in the perimeter may be contaminated",
                           "Art.9: sign 'eau impropre a la consommation' mandatory on every TWW irrigation tap",
                           "Art.10: sprinkler-irrigated perimeters must be sufficiently far from roads, settlements and drinking-water wells (no distance specified)",
                           "Art.11: no water ponding, odours, mosquito breeding sites or groundwater contamination",
                           "Art.12: cahier des charges sets specific conditions per use"],
        },
        "allowed_crops_arrete_21_06_1994": {
            "source": f"Arrete du Ministre de l'Agriculture du 21 juin 1994, as summarised in {S2} p.15", "status": "REPORTED (secondary source)",
            "industrial": ["cotton", "tobacco", "flax", "jojoba", "castor", "safflower"],
            "cereals": ["wheat", "barley", "triticale", "oat"],
            "fodder": ["berseem", "maize", "fodder sorghum", "vetch"],
            "fruit_trees": "date palm, citrus, vines - on condition they are NOT sprinkler-irrigated",
            "fodder_shrubs": ["acacia", "atriplex"], "forest_trees": True,
            "note": "List continues in source (ornamentals/golf etc. not captured). Olive is commonly irrigated with TWW in Tunisian perimeters as a fruit tree; alfalfa as fodder - engine treats both as allowed (fruit tree drip/surface; fodder) - TO_VERIFY against full arrete text."},
        "cahier_des_charges_1995": {"status": "TO_VERIFY", "note": "Text not located online within time-box."},
        "engine_rule_mapping": {"blocked": ["vegetables eaten raw (lettuce, tomato as fresh vegetable)", "direct grazing"],
                                "allowed": ["cereals", "fodder (alfalfa, oat, barley fodder)", "industrial crops", "fruit trees (no sprinkler)", "olive (as fruit tree)"],
                                "status": "ESTIMATE (QATRA interpretation of decree + arrete)"},
    }


# ---------------------------------------------------------------- 1.3 TWW quality ranges
def tww_quality():
    E = "ESTIMATE"
    rows = [
        # parameter, level, low, typical, high, unit, status, source
        ("BOD5", "secondary_activated_sludge_TN", None, 24, None, "mg/L", "REPORTED", f"ONAS mean for intensive processes cited in Benabdallah 2003 p.10 ({ETHZ})"),
        ("COD", "secondary_activated_sludge_TN", None, 85, None, "mg/L", "REPORTED", f"idem ({ETHZ})"),
        ("TSS", "secondary_activated_sludge_TN", None, 26, None, "mg/L", "REPORTED", f"idem ({ETHZ})"),
        ("faecal_coliforms", "secondary_activated_sludge_TN", 1e5, None, None, "CFU/100mL", "REPORTED", f"'>10^5' per Benabdallah 2003 citing El Koundi 2002 ({ETHZ})"),
        ("BOD5", "lagoon_TN", None, 60, None, "mg/L", "REPORTED", f"idem ({ETHZ})"),
        ("COD", "lagoon_TN", None, 206, None, "mg/L", "REPORTED", f"idem ({ETHZ})"),
        ("TSS", "lagoon_TN", None, 50, None, "mg/L", "REPORTED", f"idem ({ETHZ})"),
        ("faecal_coliforms", "lagoon_TN", 1e3, None, 1e4, "CFU/100mL", "REPORTED", f"idem ({ETHZ})"),
        ("EC", "secondary", 1.5, 3.5, 6.0, "dS/m", E, "Tunisian TWW is brackish (urban supply + coastal intrusion); range from general Tunisian literature - TO_VERIFY with Sousse Sud lab data"),
        ("SAR", "secondary", 3, 6, 12, "(meq/L)^0.5", E, "Literature range for Tunisian TWW - TO_VERIFY"),
        ("total_N", "secondary", 10, 30, 60, "mg/L", E, "Metcalf & Eddy typical secondary effluent range; high in TN when nitrification incomplete"),
        ("total_P", "secondary", 2, 6, 12, "mg/L", E, "Metcalf & Eddy typical secondary effluent"),
        ("helminth_eggs", "secondary", 0, 0.5, 5, "eggs/L", E, "WHO 2006 notes conventional secondary removes 1-3 log; target <=1/L"),
        ("faecal_coliforms", "secondary", 1e4, 1e5, 1e7, "CFU/100mL", E, "Consistent with ONAS '>10^5' above"),
        ("BOD5", "tertiary", 2, 8, 15, "mg/L", E, "Filtration + UV/chlorination typical"),
        ("COD", "tertiary", 20, 40, 70, "mg/L", E, "Typical"),
        ("TSS", "tertiary", 1, 5, 10, "mg/L", E, "Typical"),
        ("EC", "tertiary", 1.5, 3.5, 6.0, "dS/m", E, "Tertiary treatment does NOT remove salinity (same as secondary)"),
        ("SAR", "tertiary", 3, 6, 12, "(meq/L)^0.5", E, "Not changed by tertiary"),
        ("total_N", "tertiary", 5, 15, 40, "mg/L", E, "Typical"),
        ("total_P", "tertiary", 1, 4, 10, "mg/L", E, "Typical"),
        ("faecal_coliforms", "tertiary", 1, 100, 1000, "CFU/100mL", E, "UV/chlorination; WHO <=1000 target"),
        ("helminth_eggs", "tertiary", 0, 0, 0.1, "eggs/L", E, "Filtration removes eggs"),
    ]
    df = pd.DataFrame(rows, columns=["parameter", "treatment_level", "low", "typical", "high", "unit", "status", "source_or_method"])
    df["note"] = "Use REPORTED rows as anchors; ESTIMATE ranges feed the simulator only. Replace with real Sousse Sud analyses when obtained."
    return df


# ---------------------------------------------------------------- 1.2 plant details
def plants_details():
    agri = "https://catalog.data.gov.tn/fr/dataset/repartition-regionale-des-ppi-irrigues-par-les-eaux-usees-traitees"
    rows = [
        dict(plant="Sousse Sud", governorate="Sousse", serves_perimeter="Zaouiet Sousse (257 ha equipped)", treatment_level="TO_VERIFY",
             capacity_current_m3_d=10000, capacity_potential_m3_d=17800, tww_distributed_to_perimeter_m3_yr="658480 (2021/22, 2022/23); 523280 (2023/24)",
             lat=None, lon=None, status="REPORTED (capacity, volumes) / TO_VERIFY (treatment level, coords)", source=agri,
             note="Capacity is plant treatment capacity, NOT volume available to farmers. Distributed volume = ~5-7% of capacity*365."),
        dict(plant="Msaken", governorate="Sousse", serves_perimeter="Msaken (185 ha)", treatment_level="TO_VERIFY",
             capacity_current_m3_d=10000, capacity_potential_m3_d=7850, tww_distributed_to_perimeter_m3_yr="249900 (21/22); 359131 (23/24)",
             lat=None, lon=None, status="REPORTED", source=agri, note="Potential < current as published (source inconsistency)."),
        dict(plant="Sousse Hamdoun", governorate="Sousse", serves_perimeter=None, treatment_level="TO_VERIFY", capacity_current_m3_d=None,
             capacity_potential_m3_d=None, tww_distributed_to_perimeter_m3_yr=None, lat=None, lon=None, status="TO_VERIFY",
             source="https://www.eib.org/attachments/registers/85780842.pdf", note="EIB doc: Sousse Nord sludge to be transferred to Hamdoun site; 'Hamdoun II' plant announced (African Manager). No capacity found."),
        dict(plant="Sousse Nord", governorate="Sousse", serves_perimeter=None, treatment_level="TO_VERIFY", capacity_current_m3_d=None,
             capacity_potential_m3_d=20000, tww_distributed_to_perimeter_m3_yr=None, lat=None, lon=None, status="REPORTED (planned module)",
             source="https://www.eib.org/attachments/registers/85780842.pdf", note="New 20,000 m3/d / 8,000 kg BOD5/d module planned (EIB register)."),
        dict(plant="(National) ONAS tertiary", governorate="all", serves_perimeter=None, treatment_level="tertiary",
             capacity_current_m3_d=None, capacity_potential_m3_d=None, tww_distributed_to_perimeter_m3_yr=None, lat=None, lon=None,
             status="REPORTED", source="https://africanmanager.com/?p=578993", note="38 ONAS plants equipped with tertiary treatment in 2025; list not published in article."),
    ]
    return pd.DataFrame(rows)


# ---------------------------------------------------------------- 2.2 official pumping
def pumping_official():
    return pd.DataFrame([
        dict(entity="ONAS", scope="Sousse + Hammam Sousse", item="10 wastewater pumping stations, equipment rate 99%", value=10, unit="stations",
             date="2026-10", status="REPORTED (press)", source_url="https://www.lapresse.tn/?p=4365046", note="No locations/specs published."),
        dict(entity="ONAS/SUEZ PPP", scope="lot (4 regions)", item="14 WWTPs, 106 pumping stations, 1,900 km sewer", value=106, unit="stations",
             date="TO_VERIFY", status="TO_VERIFY", source_url="https://managers.tn/2023/04/26/onas-suez-construction-de-14-stations-depuration-dans-4-regions/", note="Contract scope, not national inventory."),
        dict(entity="ONAS / SONEDE / CRDA Sousse", scope="Sousse", item="Official public list of pumping stations with coordinates/specs", value=None, unit=None,
             date=None, status="NOT FOUND (public)", source_url=None,
             note="Finding: pump/network data is fragmented and not published openly. QATRA uses OSM (incomplete) + simulated specs."),
    ])


# ---------------------------------------------------------------- 2.3 pump specs
def pump_specs():
    E = "ESTIMATE"
    return pd.DataFrame([
        dict(pump_type="transfer centrifugal (plant->basin)", flow_m3_h_min=50, flow_m3_h_max=300, head_m_min=10, head_m_max=60, power_kW_min=5, power_kW_max=75, efficiency_min=0.60, efficiency_max=0.80, status=E, source="Hydraulic power P=rho g Q H/eta; typical end-suction pump efficiency ranges (Europump/Hydraulic Institute); manufacturer catalogues - TO_VERIFY specific model"),
        dict(pump_type="farm borehole submersible (Sahel TN)", flow_m3_h_min=5, flow_m3_h_max=40, head_m_min=30, head_m_max=150, power_kW_min=2.2, power_kW_max=30, efficiency_min=0.45, efficiency_max=0.70, status=E, source="Sahel aquifer depths ~20-120 m (TO_VERIFY with DGRE); submersible pump curves (e.g. 4\"/6\" catalogues)"),
        dict(pump_type="surface farm pump (basin->drip)", flow_m3_h_min=5, flow_m3_h_max=50, head_m_min=15, head_m_max=40, power_kW_min=0.75, power_kW_max=7.5, efficiency_min=0.45, efficiency_max=0.70, status=E, source="Drip systems need ~10-20 m operating pressure + losses"),
        dict(pump_type="solar PV pumping sizing", flow_m3_h_min=None, flow_m3_h_max=None, head_m_min=None, head_m_max=None, power_kW_min=None, power_kW_max=None, efficiency_min=None, efficiency_max=None, status=E,
             source="Rule of thumb: PV array kWp = 1.2-1.5 x pump motor kW (FAO/GIZ 'Solar Powered Irrigation Systems' toolbox) - TO_VERIFY", pv_kwp_per_pump_kw_min=1.2, pv_kwp_per_pump_kw_max=1.5),
    ])


# ---------------------------------------------------------------- 5.1 FAO-56 Kc
def crop_kc():
    S = f"FAO-56 (Allen et al. 1998) Table 12 (Kc), Table 11 (stage lengths), Table 22 (root depth) - {FAO56}"
    rows = [  # crop, kc_ini, kc_mid, kc_end, L_ini, L_dev, L_mid, L_late, root_min, root_max, note, status
        ("olive", 0.65, 0.70, 0.70, 30, 90, 60, 90, 1.2, 1.7, "40-60% ground cover; Mediterranean, March start", "REPORTED"),
        ("citrus", 0.70, 0.65, 0.70, 60, 90, 120, 95, 1.2, 1.5, "no ground cover, ~70% canopy", "REPORTED"),
        ("pomegranate", 0.40, 0.65, 0.50, 30, 60, 120, 60, 1.0, 1.5, "NOT in FAO-56; literature-based (e.g. Intrigliolo et al.)", "ESTIMATE / TO_VERIFY"),
        ("alfalfa", 0.40, 0.95, 0.90, 10, 30, 25, 10, 1.0, 2.0, "Kc = averaged-cutting values; stage lengths = one cutting cycle", "REPORTED"),
        ("barley", 0.30, 1.15, 0.25, 20, 25, 60, 30, 1.0, 1.5, "grain", "REPORTED"),
        ("wheat", 0.40, 1.15, 0.30, 30, 140, 40, 30, 1.5, 1.8, "winter wheat, Mediterranean Nov sowing (kc_ini 0.4 non-frozen)", "REPORTED"),
        ("oat_fodder", 0.30, 1.15, 0.25, 15, 25, 50, 30, 1.0, 1.5, "oats as small grain; fodder harvest earlier -> kc_end higher in practice", "REPORTED / TO_VERIFY stage lengths"),
        ("lettuce", 0.70, 1.00, 0.95, 30, 40, 25, 10, 0.3, 0.5, "Mediterranean Nov-Jan", "REPORTED"),
        ("tomato", 0.60, 1.15, 0.80, 30, 40, 40, 25, 0.7, 1.5, "kc_end 0.70-0.90 range; arid region", "REPORTED"),
    ]
    df = pd.DataFrame(rows, columns=["crop", "kc_ini", "kc_mid", "kc_end", "len_ini_d", "len_dev_d", "len_mid_d", "len_late_d",
                                     "root_depth_min_m", "root_depth_max_m", "note", "status"])
    df["source"] = S
    df["caveat"] = "Transcribed from FAO-56 tables (standard climate RHmin 45%, u2 2 m/s); adjust Kc_mid for Sousse RHmin/wind per FAO-56 eq.62. Spot-check before publication."
    return df


# ---------------------------------------------------------------- 5.2 salt tolerance + guidelines
def salt_tolerance():
    S = f"FAO-29 rev.1 (Ayers & Westcot 1985) Table 4, after Maas 1984 - {FAO29}"
    rows = [  # crop, threshold ECe, slope %/dS/m, rating, status
        ("barley", 8.0, 5.0, "T", "REPORTED"), ("wheat", 6.0, 7.1, "MT", "REPORTED"),
        ("alfalfa", 2.0, 7.3, "MS", "REPORTED"), ("lettuce", 1.3, 13.0, "MS", "REPORTED"),
        ("tomato", 2.5, 9.9, "MS", "REPORTED"), ("citrus_orange", 1.7, 16.0, "S", "REPORTED"),
        ("olive", 4.0, None, "MT", "ESTIMATE / TO_VERIFY (threshold not established in FAO-29; MT rating)"),
        ("pomegranate", 4.0, None, "MT", "ESTIMATE / TO_VERIFY (Maas: MT, no threshold)"),
        ("oat_fodder", None, None, "T (TO_VERIFY)", "TO_VERIFY"),
        ("barley_fodder", 6.0, 7.1, "MT", "REPORTED"),
    ]
    df = pd.DataFrame(rows, columns=["crop", "ECe_threshold_dS_m", "yield_decline_pct_per_dS_m", "tolerance_rating", "status"])
    df["source"] = S
    df["yield_formula"] = "Y% = 100 - b*(ECe - a) for ECe > a"
    df["caveat"] = "Values transcribed from FAO-29 Table 4; spot-check against source."
    return df


def water_guidelines():
    S = f"FAO-29 rev.1 (Ayers & Westcot 1985) Table 1 - {FAO29}"
    rows = [
        ("Salinity", "ECw", "dS/m", "<0.7", "0.7-3.0", ">3.0"),
        ("Salinity", "TDS", "mg/L", "<450", "450-2000", ">2000"),
        ("Infiltration", "SAR 0-3 with ECw", "dS/m", ">0.7", "0.7-0.2", "<0.2"),
        ("Infiltration", "SAR 3-6 with ECw", "dS/m", ">1.2", "1.2-0.3", "<0.3"),
        ("Infiltration", "SAR 6-12 with ECw", "dS/m", ">1.9", "1.9-0.5", "<0.5"),
        ("Infiltration", "SAR 12-20 with ECw", "dS/m", ">2.9", "2.9-1.3", "<1.3"),
        ("Infiltration", "SAR 20-40 with ECw", "dS/m", ">5.0", "5.0-2.9", "<2.9"),
        ("Sodium toxicity", "surface irrigation SAR", "-", "<3", "3-9", ">9"),
        ("Sodium toxicity", "sprinkler Na", "meq/L", "<3", ">3", "-"),
        ("Chloride toxicity", "surface irrigation Cl", "meq/L", "<4", "4-10", ">10"),
        ("Chloride toxicity", "sprinkler Cl", "meq/L", "<3", ">3", "-"),
        ("Boron toxicity", "B", "mg/L", "<0.7", "0.7-3.0", ">3.0"),
        ("Misc.", "NO3-N", "mg/L", "<5", "5-30", ">30"),
        ("Misc.", "HCO3 (overhead sprinkling)", "meq/L", "<1.5", "1.5-8.5", ">8.5"),
        ("Misc.", "pH", "-", "normal range 6.5-8.4", "", ""),
    ]
    df = pd.DataFrame(rows, columns=["problem", "parameter", "unit", "none", "slight_to_moderate", "severe"])
    df["status"] = "REPORTED"; df["source"] = S
    df = pd.concat([df, pd.DataFrame([{"problem": "Leaching requirement", "parameter": "LR", "unit": "fraction",
            "none": "LR = ECw / (5*ECe - ECw)  (surface/sprinkler; ECe = crop threshold)", "slight_to_moderate": "drip/high-frequency: LR = ECw / (2*max ECe)",
            "severe": "", "status": "REPORTED", "source": f"FAO-29 eq. (7) and (8) - {FAO29}"}])])
    return df


# ---------------------------------------------------------------- 4.2/4.3 soil salinity refs
def soil_salinity():
    return pd.DataFrame([
        dict(item="Zaouiet Sousse perimeter irrigated with TWW since ~1987-1995", value=None, unit=None, status="REPORTED",
             source="https://erudit.org/en/revue/rseau/2010/v23/n2/039905ar.html", note="Study exists on Zaouit Sousse soils under TWW; values not extracted in time-box -> TO_VERIFY"),
        dict(item="Coastal Sahel perimeters (Sousse, Monastir, Mahdia, Sfax) classed as saline", value=None, unit=None, status="REPORTED (1989)",
             source="https://horizon.documentation.ird.fr/exl-doc/pleins_textes/doc34-06/40530.pdf", note="IRD 1989; qualitative"),
        dict(item="Sfax El Hajeb: fluvisol (4 yrs TWW) more salinised than calcisol (15 yrs)", value=None, unit=None, status="REPORTED",
             source="https://www.afes.fr/wp-content/uploads/2023/04/EGS_24_1_louati.pdf", note="Qualitative; magnitudes TO_VERIFY"),
        dict(item="Soukra: only slight salinisation after TWW irrigation", value=None, unit=None, status="REPORTED (1997)",
             source="https://ressources.ciheam.org/ressources/om/pdf/a31/CI971541.pdf", note="Qualitative"),
        dict(item="Typical ECe of TWW-irrigated Tunisian coastal soils (0-30 cm)", value="1.5-6", unit="dS/m", status="ESTIMATE / TO_VERIFY",
             source="Order-of-magnitude from steady-state ECe ~ 1.5 x ECw (FAO-29, LF 15-20%) with ECw 1-4 dS/m", note="Used to parametrise simulated farms"),
        dict(item="FAO HWSD v2 (has EC / salinity attributes, ~1 km)", value=None, unit=None, status="TO_VERIFY (not downloaded)",
             source="https://www.fao.org/soils-portal/data-hub/soil-maps-and-databases/harmonized-world-soil-database-v20/en/", note="Requires desktop raster+MDB download (~GB); skipped in time-box"),
        dict(item="SoilFER-VACS Tunisia (FAO, funded by Japan MOFA, USD 6M, May 2023-May 2027)", value=">3000 soil samples collected (Mar 2026)", unit=None,
             status="REPORTED (no public maps yet)", source="https://www.fao.org/in-action/soilfer/countries/detail/tunisia/en",
             note="National maps (SOC, pH, texture, BD) planned; no public download found as of 2026-11. Contact soilfer@fao.org"),
    ])


# ---------------------------------------------------------------- 5.3 Sousse crops
def sousse_crops():
    return pd.DataFrame([
        dict(metric="Olive orchard area, Sousse governorate", value=78000, unit="ha", date="TO_VERIFY (press, ~2023-2025)", status="REPORTED (press)",
             source_url="https://en.africanmanager.com/?p=238901", definition="Area under olive trees", note="Stated as 55% of governorate area (TO_VERIFY wording) and 8% of national olive area"),
        dict(metric="Olive trees, Sousse governorate", value=5500000, unit="trees", date="TO_VERIFY", status="REPORTED (press)",
             source_url="https://www.leconomistemaghrebin.com/?p=541722", definition="Number of trees", note="Another source gives 4.3 million: use with caution"),
        dict(metric="Olive harvest forecast, Sousse, 2025/26 season", value=130000, unit="t olives", date="2025", status="REPORTED (CRDA via press)",
             source_url="https://africanmanager.com/?p=513936", definition="Forecast olive harvest", note="~26,000 t oil; vs 37,000 t olives in 2023"),
        dict(metric="TWW-irrigated perimeters, Sousse (2023/24)", value="Zaouiet Sousse 257 ha; Msaken 185 ha; Sousse Sud/Ksiba 200 ha", unit="ha equipped", date="2023/2024",
             status="REPORTED", source_url="https://catalog.data.gov.tn/fr/dataset/repartition-regionale-des-ppi-irrigues-par-les-eaux-usees-traitees", definition="Area equipped", note="Crop mix per perimeter not in dataset"),
        dict(metric="Other crops (cereals, fodder, vegetables) area, Sousse", value=None, unit="ha", date=None, status="TO_VERIFY",
             source_url="https://catalog.agridata.tn", definition=None, note="Agridata/ONAGRI regional statistics not extracted in time-box"),
    ])


# ---------------------------------------------------------------- 8 energy
def energy_params():
    return {
        "pump_energy_formula": {"formula": "E_kWh_per_m3 = 0.00272 * H_m / eta", "derivation": "rho*g/3.6e6 = 1000*9.81/3.6e6 = 0.002725 kWh/(m3*m)",
                                "status": "REPORTED (physics)", "source": "Standard hydraulic power P = rho g Q H / eta"},
        "eta_wire_to_water": {"min": 0.5, "typical": 0.65, "max": 0.75, "status": "ESTIMATE", "source": "Typical irrigation pumping plant efficiency ranges (FAO/ASABE pumping plant performance criteria) - TO_VERIFY"},
        "pv_formula": {"formula": "E_kWh = kWp * GHI_W_m2/1000 * PR * dt_h", "PR": 0.8, "status": "ESTIMATE", "note": "horizontal GHI; tilted array gives ~+5-15% annual"},
        "grid_emission_factor_kgCO2_kWh": {"value": None, "status": "TO_VERIFY", "note": "Tunisian grid ~70% natural gas; use IEA/IFI factor when sourced"},
        "steg_average_sale_price_2025": {"value": 290.7, "unit": "millimes/kWh", "status": "REPORTED (press)", "definition": "STEG average selling price, all customers",
                                         "source": "https://www.webmanagercenter.com/2025/07/21/549443/production-delectricite-quasi-stable-dont-6-a-partir-des-energies-renouvelables/"},
        "steg_average_production_cost_2025": {"value": 456.3, "unit": "millimes/kWh", "status": "REPORTED (press)", "source": "idem"},
    }


def steg_tariffs():
    return pd.DataFrame([
        dict(tariff="Low-voltage 'pompage agricole / irrigation'", value=None, unit="millimes/kWh", date=None, status="TO_VERIFY",
             source_url="https://www.steg.com.tn", note="Tariff exists (STEG debt-rescheduling for LV irrigation-pumping subscribers, May 2025) but current grid not found in time-box"),
        dict(tariff="STEG average sale price (all customers) 2025", value=290.7, unit="millimes/kWh", date="2025", status="REPORTED (press)",
             source_url="https://www.webmanagercenter.com/2025/07/21/549443/production-delectricite-quasi-stable-dont-6-a-partir-des-energies-renouvelables/", note="NOT the agricultural tariff"),
        dict(tariff="STEG average production cost 2025", value=456.3, unit="millimes/kWh", date="2025", status="REPORTED (press)", source_url="idem", note="Cost, not tariff"),
    ])


# ---------------------------------------------------------------- 9 context figures
def context_figures():
    R = "REPORTED"
    rows = [
        ("CF01", "Treated wastewater produced", 318, "million m3/yr", "2023", "Tunisia, ONAS plants", "Volume of treated wastewater produced", "Rapport national du secteur de l'eau 2023, cited by A. Ben Rayana (allAfrica, 2025-07-13)", "https://fr.allafrica.com/stories/202507130118.html", "2025-07-13", R),
        ("CF02", "Number of ONAS treatment plants", 127, "plants", "2023", "Tunisia", "WWTPs operated by ONAS", "idem", "https://fr.allafrica.com/stories/202507130118.html", "2025-07-13", R),
        ("CF03", "Wastewater treated by ONAS", 295.7, "million m3", "2024", "Tunisia, 127 plants", "Volume treated", "Rapport national sur le secteur de l'eau 2024 (via Kapitalis)", "https://kapitalis.com/tunisie/2026/06/23/tunisie-vers-une-utilisation-sure-des-eaux-usees-traitees-en-agriculture/", "2026-06-23", R),
        ("CF04", "Agricultural use of TWW (volume)", 11.3, "million m3", "2024 (other source: campaign 2023/24)", "Tunisia", "TWW volume used in agriculture", "Rapport national eau 2024 via Kapitalis; Tunisie Numerique gives 2023/24 campaign", "https://kapitalis.com/tunisie/2026/06/23/tunisie-vers-une-utilisation-sure-des-eaux-usees-traitees-en-agriculture/", "2026-06-23", R),
        ("CF05", "Agricultural use of TWW (share of treated)", 3.8, "%", "2024", "Tunisia", "Agricultural use / total TWW treated", "idem", "https://kapitalis.com/tunisie/2026/06/23/tunisie-vers-une-utilisation-sure-des-eaux-usees-traitees-en-agriculture/", "2026-06-23", R),
        ("CF06", "TWW reuse rate, all uses", 22, "%", "stated 2026-08", "Tunisia", "Share of TWW reused, all uses (agri, golf, green spaces, etc.)", "O. Mahjoub (INRGREF), Radio Nationale, via La Presse 2026-08-11", "https://www.lapresse.tn/2026/08/11/vers-la-reutilisation-de-plus-de-80-des-eaux-usees-traitees-a-lhorizon-2050/", "2026-08-11", R),
        ("CF07", "TWW reuse for agriculture (share)", 4, "%", "stated 2026-08", "Tunisia", "Agricultural share (of TWW produced)", "idem", "https://www.lapresse.tn/?p=4352872", "2026-08-11", R),
        ("CF08", "TWW actually exploited (statement)", "<10", "%", "2025", "Tunisia", "Share of TWW exploited", "A. Ben Rayana (allAfrica 2025-07-13). Note: other sources give 5-7% (2024) - definitions differ", "https://fr.allafrica.com/stories/202507130118.html", "2025-07-13", R),
        ("CF09", "TWW irrigated perimeters", 36, "perimeters", "2026", "Tunisia, 17 governorates", "Perimeters equipped for TWW irrigation", "L'Economiste Maghrebin 2026-09-02", "https://www.leconomistemaghrebin.com/2026/09/02/eaux-usees-traitees-la-tunisie-peut-elle-en-faire-une-veritable-ressource-agricole/", "2026-09-02", R),
        ("CF10", "TWW perimeters area equipped", 7819, "ha", "2026", "Tunisia", "Area equipped (amenagee)", "idem", "https://www.leconomistemaghrebin.com/2026/09/02/eaux-usees-traitees-la-tunisie-peut-elle-en-faire-une-veritable-ressource-agricole/", "2026-09-02", R),
        ("CF11", "TWW perimeters area actually irrigated", 2778, "ha", "July 2026", "Tunisia", "Area effectively irrigated (~36% of equipped)", "authorities cited by L'Economiste Maghrebin", "https://www.leconomistemaghrebin.com/2026/09/02/eaux-usees-traitees-la-tunisie-peut-elle-en-faire-une-veritable-ressource-agricole/", "2026-09-02", R),
        ("CF12", "TWW perimeters: equipped / irrigated (official dataset)", "7593 / 2363", "ha", "campaign 2021/22", "Tunisia", "Sum of perimeter rows", "Ministere de l'Agriculture / Agridata via data.gov.tn", "https://catalog.data.gov.tn/fr/dataset/repartition-regionale-des-ppi-irrigues-par-les-eaux-usees-traitees", "TO_VERIFY", R),
        ("CF13", "ONAS plants with tertiary treatment", 38, "plants", "2025", "Tunisia", "Plants equipped with tertiary treatment", "ONAS via African Manager", "https://africanmanager.com/?p=578993", "TO_VERIFY", R),
        ("CF14", "Court of Auditors: TWW not compliant with Tunisian standards", 61, "%", "audit period 2008-2011", "ONAS plants", "Share of treated water non-compliant", "Cour des comptes, 28th annual report (published May 2014)", "https://www.leconomistemaghrebin.com/2014/05/15/tunis-defaillances-onas/", "2014-05-15", R),
        ("CF15", "Court of Auditors: plants meeting no standard", 33, "plants", "audit period 2008-2011", "ONAS", "Plants satisfying no standard", "idem; also: only 9 of 55 parameters analysed; control covers 37% of plants", "https://www.webdo.tn/fr/actualite/national/tunisie-40-eaux-traitees-ne-conformes-aux-normes-sanitaires/161354/", "2014-05", R),
        ("CF16", "Water 2050: agricultural valorisation target", 70, "% of TWW", "target 2050", "Tunisia", "Target share of TWW valorised in agriculture", "Strategie Eau 2050 (La Presse 2026-07-18)", "https://www.lapresse.tn/2026/07/18/strategie-eau-2050-vers-une-valorisation-de-70-des-eaux-usees-traitees/", "2026-07-18", "PROJECTION"),
        ("CF17", "Water 2050: valorised TWW volume target", 450, "million m3/yr", "target 2050", "Tunisia", "Valorised volume (of 560 Mm3 expected production)", "idem / L'Economiste Maghrebin 2026-07-01", "https://www.leconomistemaghrebin.com/2026/07/01/eaux-usees-en-tunisie-450-millions-de-m%C2%B3-promis-en-2050-mais-a-quel-prix-pour-lenvironnement-et-la-sante/", "2026-07-01", "PROJECTION"),
        ("CF18", "Water 2050: expected TWW production", 560, "million m3/yr", "2050", "Tunisia", "Expected TWW production", "idem", "https://www.leconomistemaghrebin.com/2026/07/01/eaux-usees-en-tunisie-450-millions-de-m%C2%B3-promis-en-2050-mais-a-quel-prix-pour-lenvironnement-et-la-sante/", "2026-07-01", "PROJECTION"),
        ("CF19", "Water 2050: TWW valorisation projects", 120, "projects", "2050 plan", "Tunisia", "Planned projects (~56,000 ha irrigation + recharge, green spaces, industry)", "idem", "https://www.leconomistemaghrebin.com/?p=680074", "2026", "PROJECTION"),
        ("CF20", "Water 2050: share of strategy funds to TWW valorisation in agriculture", 53, "%", "2050 plan", "Tunisia", "Share of strategy investment", "WebManagerCenter 2026-07-20", "https://www.webmanagercenter.com/2026/07/20/570318/tunisie-53-des-investissements-de-la-strategie-nationale-de-leau-2050-dedies-aux-eaux-usees-traitees/", "2026-07-20", "PROJECTION"),
        ("CF21", "Water 2050: planned national e-platform for TWW", None, None, None, "Tunisia", None, "Not confirmed in sources read", None, None, "TO_VERIFY"),
        ("CF22", "SONEDE total water consumed (all uses)", 516, "million m3", "2023", "Tunisia, SONEDE network", "Total volume consumed by SONEDE subscribers (not only households)", "WebManagerCenter 'SONEDE: les chiffres' 2025-07-21", "https://www.webmanagercenter.com/2025/07/21/549519/sonede-les-chiffres/", "2025-07-21", R),
        ("CF23", "Summer 2026: hottest summer since 1950", "+2.9", "degC anomaly vs 1991-2020", "JJA 2026", "Tunisia", "Seasonal mean temperature anomaly", "INM seasonal bulletin via allAfrica/La Presse 2026-09-22", "https://www.lapresse.tn/2026/09/22/lete-2026-classe-le-plus-chaud-en-tunisie-depuis-1950/", "2026-09-22", R),
        ("CF24", "August 2026 national mean temperature", 32.3, "degC (normal 28.9)", "Aug 2026", "Tunisia", "Monthly mean temperature", "INM via allAfrica", "https://fr.allafrica.com/stories/202609220426.html", "2026-09-22", R),
        ("CF25", "Summer 2026 max temperature", 49.7, "degC", "2026-07-17", "Kairouan", "Station maximum", "INM via Africanews", "https://www.africanews.com/2026/09/22/tunisia-says-2026-summer-hottest-on-record-temperatures-topped-497c/", "2026-09-22", R),
        ("CF26", "Power outages concentrated 13:00-17:00", "13:00-17:00", "local time", "summer 2026", "Tunisia", "Time window of rolling outages (crowd-sourced data; up to 12 h)", "Human Rights Watch, 'Tunisia: Power, Water Shortages Endanger Rights'", "https://www.hrw.org/news/2026/10/06/tunisia-power-water-shortages-endanger-rights", "2026-10-06", R),
        ("CF27", "Water Observatory: supply disruption reports in July 2026", 608, "reports", "July 2026", "Tunisia", "Citizen reports (549 = unannounced cuts/disruptions); another count: 604", "Observatoire tunisien de l'eau via La Presse 2026-08-09", "https://www.lapresse.tn/2026/08/09/perturbation-de-lalimentation-en-eau-potable-plus-de-six-cent-signalements-en-un-mois/", "2026-08-09", R),
        ("CF28", "Dam filling rate mid-June 2026", 60, "% of capacity", "mid-June 2026", "Tunisia, all dams", "Reserve / total capacity", "DG Barrages, Ministry of Agriculture (Business News 2026-06-23)", "https://businessnews.com.tn/2026/06/23/barrages-le-taux-de-remplissage-atteint-60-selon-le-ministere-de-lagriculture/1407255/", "2026-06-23", R),
        ("CF29", "Dam filling rate 23 Oct 2026", 46, "% of capacity (~1.075 billion m3)", "2026-10-23", "Tunisia, all dams", "Reserve / total capacity", "Ministry of Agriculture via Tuniscope (ONAGRI daily bulletin stopped Oct 2025)", "https://www.tuniscope.com/ar/article/443148/actualites/societe/alias-100913", "2026-10-24", R),
        ("CF30", "Dam filling rate August 2026", None, "%", "Aug 2026", "Tunisia", None, "Not found", None, None, "TO_VERIFY"),
        ("CF31", "Zaouiet Sousse TWW perimeter: equipped area", 257, "ha", "2023/24", "Zaouiet Sousse (fed by Sousse Sud WWTP)", "Area equipped", "Agridata / data.gov.tn", "https://catalog.data.gov.tn/fr/dataset/repartition-regionale-des-ppi-irrigues-par-les-eaux-usees-traitees", "TO_VERIFY", R),
        ("CF32", "Zaouiet Sousse TWW distributed", 523280, "m3/yr", "campaign 2023/24", "Zaouiet Sousse perimeter", "TWW volume distributed", "Agridata / data.gov.tn", "https://catalog.data.gov.tn/fr/dataset/repartition-regionale-des-ppi-irrigues-par-les-eaux-usees-traitees", "TO_VERIFY", R),
    ]
    return pd.DataFrame(rows, columns=["id", "metric", "value", "unit", "period", "scope", "definition", "source_name", "source_url", "publication_date", "status"])


def main():
    (CLEAN / "nt106003_rules.json").write_text(json.dumps(nt106003(), ensure_ascii=False, indent=1), encoding="utf-8")
    (CLEAN / "energy_params.json").write_text(json.dumps(energy_params(), ensure_ascii=False, indent=1), encoding="utf-8")
    out = {"tww_quality_ranges": tww_quality(), "plants_details": plants_details(),
           "pumping_stations_official": pumping_official(), "pump_specs_reference": pump_specs(),
           "crop_kc": crop_kc(), "crop_salt_tolerance": salt_tolerance(),
           "irrigation_water_quality_guidelines": water_guidelines(), "soil_salinity_reference": soil_salinity(),
           "sousse_crops": sousse_crops(), "steg_tariffs": steg_tariffs(), "context_figures": context_figures()}
    for k, df in out.items():
        df.to_csv(CLEAN / f"{k}.csv", index=False, encoding="utf-8"); print(k, df.shape)


if __name__ == "__main__":
    main()
