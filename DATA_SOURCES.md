# Curve data and attribution

This repository contains only the futures-curve project. Its frozen observations are bundled in [market.js](market.js); it does not include the separate storage, weather or API datasets from the original portfolio.

| Source | Material in this repository | Original reference |
| :--- | :--- | :--- |
| EIA / NYMEX | 28,048 observations across 7,012 selected complete four-contract curves, 1994-02-01–2024-04-05 | [EIA futures series](https://www.eia.gov/dnav/ng/ng_pri_fut_s1_d.htm), [definitions and source](https://www.eia.gov/dnav/ng/tbldefs/ng_pri_fut_tbldef2.asp) |
| U.S. 12 Month Natural Gas Fund SEC filings | 156 reconstructed prices across 13 position dates, 2023-09-29–2026-09-30 | The `meta.sources` map in [market.js](market.js) and the expandable filing list in [the application's Data notes](index.html) |

For each long futures position, the reconstruction uses `(original notional + signed unrealized gain/loss) / (contracts × 10,000 MMBtu)`, rounded to $0.001/MMBtu. Observation dates refer to positions; the corresponding filings became public later. The EIA archive uses nearby contract ranks and reconstructed delivery labels. Source limitations and excluded observations are described in the application.

The original input data and methodology come from source commit `80c2e5321dadc95aadd4c7f65792fb15f0e2f156`; [SOURCE_SNAPSHOT.json](SOURCE_SNAPSHOT.json) records that provenance. The standalone data are frozen, and source files may subsequently be revised. Neither dataset is a live quotation service or a continuous, unfiltered settlement record.

Public availability does not necessarily grant unrestricted redistribution or commercial reuse. The original source's terms remain applicable, including any third-party material in filings or EIA publications. No repository-wide license or new rights to third-party content are granted here.
