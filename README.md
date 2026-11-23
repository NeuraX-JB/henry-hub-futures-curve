# Henry Hub Futures Curve Explorer

**John Barreto · Independent natural gas research**

Compare historical Henry Hub delivery-month prices, March–April spreads and winter premiums using two explicitly separate archives.

**[Open this project](https://neurax-jb.github.io/henry-hub-futures-curve/) · [Worked research note](lab/research/curve-repricing.md) · [Original research portfolio](https://neurax-jb.github.io/Henry-Hub-Futures-Curve-Explorer-How-the-Natural-Gas-Market-prices-winter/lab/)**

This standalone edition is a **historical snapshot**, with no live price feed or scheduled refresh. EIA observations end on **5 April 2024**; reconstructed SEC snapshots end on **30 September 2026**. These are observation dates, not a claim that filings were publicly available on those dates.

## Research question

When the natural gas market reprices a curve, do different delivery months and seasons move by the same amount?

Try the [June–September 2026 comparison](https://neurax-jb.github.io/henry-hub-futures-curve/?data=strips&view=curve&a=2026-06-30&b=2026-09-30&align=delivery). January 2027 changes from $4.391 to $3.752 per MMBtu in these archived reconstructions. The difference is −$0.639 per MMBtu; the comparison establishes repricing, not its cause.

## Data and methods

| Dataset | Frozen coverage | Interpretation |
| :--- | :--- | :--- |
| EIA daily archive | 7,012 selected dates, 1 February 1994–5 April 2024; four nearby contracts per date | Delivery months reconstructed from EIA contract ranks and checked roll dates; incomplete curves, carry-forwards and unverified rolls excluded |
| SEC fund holdings | 13 observations, 29 September 2023–30 September 2026; 12 prices per observation | Prices reconstructed from fund positions and rounded to $0.001/MMBtu; filings were published after the position dates |

The sources have different coverage and construction. They do not form a continuous exchange settlement history. See [DATA_SOURCES.md](DATA_SOURCES.md) and **Data notes** in the application for original source links and the reconstruction formula.

- **Delivery alignment** matches the same calendar delivery month. Changes are B minus A; blanks mean an unobserved leg.
- **Tenor alignment** anchors each curve's first quoted delivery month at M1. Calendar gaps are retained, so an absent month does not shift later contracts into the wrong tenor.
- **March–April** subtracts April from March for the same delivery year and observation date. Years align by calendar days before 1 March; lines connect observed pairs.
- **Winter premium** is the simple mean of November–March minus the following April–October. All five winter and seven summer months are required; months carry equal weight.

## Use your own observations

Open **Data notes → Import settlement data** and choose a local CSV smaller than 12 MB:

```csv
date,month,price
2025-09-30,2026-01,4.177
2025-09-30,2026-02,3.952
```

Use ISO calendar dates (`YYYY-MM-DD`), delivery months (`YYYY-MM`) and numeric USD/MMBtu prices. Blank prices, duplicate date/month pairs, invalid dates and non-finite values are rejected. Negative prices are allowed. The supported numeric range is ±1,000,000,000 USD/MMBtu, preventing extreme floating-point inputs from breaking calculations and chart ranges. Imports stay in the current tab until reload; shared URLs restore only bundled datasets.

CSV exports include **all comparison rows**, including rows not yet expanded in the table, plus dataset, price origin, original source links and the source snapshot commit. Use arrow keys, Home and End to inspect chart points; the detailed table provides the same numeric observations.

## Run and verify locally

Requirements: Python 3 for a static server and Node.js for tests. There are no application runtime dependencies, API keys or network fetches.

```sh
python -m http.server 8000
# Open http://localhost:8000/
node --test tests/*.test.cjs
python scripts/validate.py --static-only
```

`market.js` contains the original bundled data, unchanged. `engine.js` implements parsing and calculations; `plot.js` renders the SVG chart; `app.js` manages the views. See [VALIDATION.md](VALIDATION.md) for repository checks and [SOURCE_SNAPSHOT.json](SOURCE_SNAPSHOT.json) for source provenance.

## Source and publication

This project was extracted from the [canonical research lab](https://github.com/NeuraX-JB/Henry-Hub-Futures-Curve-Explorer-How-the-Natural-Gas-Market-prices-winter/tree/80c2e5321dadc95aadd4c7f65792fb15f0e2f156) at commit `80c2e5321dadc95aadd4c7f65792fb15f0e2f156`. The standalone interface is maintained here; its historical data remain frozen unless an explicit, reviewed refresh changes them. The original website and forecast ledger remain separate.

Research and education, not investment advice. No new license is granted; review the [source and attribution notes](DATA_SOURCES.md) before reuse.
