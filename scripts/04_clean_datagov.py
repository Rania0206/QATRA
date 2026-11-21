"""Module 1.4 / 3.2 - clean data.gov.tn (Agridata / Ministry of Agriculture) treated-water irrigation files.

Inputs (downloaded once from catalog.data.gov.tn dataset pages; robots.txt-compliant /cms/download/ links):
  data/raw/datagov/repartition-regionale-des-ppi-irrigues-par-les-eaux-usees-traitees-campagne.xlsx
  data/raw/datagov/evolution-de-la-consommation-en-eut.xlsx
Outputs: data/clean/tww_irrigated_areas.csv, data/clean/tww_consumption_by_perimeter.csv
"""
import pandas as pd, numpy as np
from common import *

SRC_PPI = "https://catalog.data.gov.tn/fr/dataset/repartition-regionale-des-ppi-irrigues-par-les-eaux-usees-traitees"
SRC_CONS = "https://catalog.data.gov.tn/fr/dataset/evolution-de-la-consommation-des-eaux-usees-traitees-par-perimetre-en-m3"


def num(x):
    if isinstance(x, str):
        x = x.strip().replace(",", ".")
        if x in ("", "-", "NF", "N.F", "NaN"): return np.nan
    try: return float(x)
    except Exception: return np.nan


def main():
    x = pd.read_excel(RAW / "datagov" / "repartition-regionale-des-ppi-irrigues-par-les-eaux-usees-traitees-campagne.xlsx", header=0)
    x.columns = ["campaign", "governorate", "perimeter", "wwtp", "wwtp_capacity_current_m3_d",
                 "wwtp_capacity_potential_m3_d", "commissioning_year", "area_equipped_ha",
                 "area_operated_ha", "area_irrigated_ha", "intensification_ratio", "tww_volume_distributed_m3_yr"]
    x = x[x["campaign"].notna() & x["governorate"].notna()]
    x["is_total_row"] = x["governorate"].astype(str).str.strip().str.lower().eq("total")
    for c in ["wwtp_capacity_current_m3_d", "wwtp_capacity_potential_m3_d", "area_equipped_ha", "area_operated_ha",
              "area_irrigated_ha", "intensification_ratio", "tww_volume_distributed_m3_yr"]:
        x[c] = x[c].map(num)
    for c in ["governorate", "perimeter", "wwtp"]:
        x[c] = x[c].astype(str).str.replace(r"\s+", " ", regex=True).str.strip().replace("nan", None)
    x["governorate"] = x["governorate"].str.upper()
    x["source"] = "Ministere de l'Agriculture / Agridata via data.gov.tn"
    x["source_url"] = SRC_PPI
    x["status"] = "REPORTED"
    x["note"] = ("NF = not functional (blank). intensification_ratio = irrigated/equipped as published (can exceed 1 when "
                 "double cropping). WWTP capacity is plant treatment capacity, NOT the volume available to farmers.")
    x.to_csv(CLEAN / "tww_irrigated_areas.csv", index=False, encoding="utf-8")
    print("tww_irrigated_areas", x.shape, x["campaign"].unique())
    print(x[x["governorate"] == "SOUSSE"][["campaign", "perimeter", "wwtp", "wwtp_capacity_current_m3_d",
                                          "area_equipped_ha", "area_irrigated_ha", "tww_volume_distributed_m3_yr"]].to_string())

    c = pd.read_excel(RAW / "datagov" / "evolution-de-la-consommation-en-eut.xlsx", sheet_name=0, header=0)
    c.columns = ["crda", "perimeter", "commissioning_year"] + [str(k).replace("-", "/") for k in c.columns[3:]]
    c["crda"] = c["crda"].astype(str).str.strip()
    long = c.melt(id_vars=["crda", "perimeter", "commissioning_year"], var_name="campaign", value_name="tww_consumed_m3")
    long["tww_consumed_m3"] = long["tww_consumed_m3"].map(num)
    long = long[long["tww_consumed_m3"].notna() | long["perimeter"].notna()]
    long = long[~(long["perimeter"].isna() & (long["crda"] != "TOTAL"))]
    long["source_url"] = SRC_CONS
    long["status"] = "REPORTED"
    long["note"] = "Volume of TWW consumed per irrigated perimeter per agricultural campaign (m3). 2012/2013 column absent in source."
    long.to_csv(CLEAN / "tww_consumption_by_perimeter.csv", index=False, encoding="utf-8")
    print("tww_consumption", long.shape)
    print(long[long["perimeter"] == "Zaouiet Sousse"].tail(6).to_string())


if __name__ == "__main__":
    main()
