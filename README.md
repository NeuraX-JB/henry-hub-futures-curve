# Henry Hub Futures Curve Explorer

**John Barreto · Independent natural gas research**

How differently can January and July gas reprice between the same two dates? In the June and September 2026 fund holdings, January 2027 delivery fell **$0.639/MMBtu** and July fell **$0.160/MMBtu**. Both comparisons hold the delivery contract fixed. The explorer lets you repeat the calculation across the nine overlapping months.

[Compare the June and September curves](https://neurax-jb.github.io/henry-hub-futures-curve/?data=strips&view=curve&a=2026-06-30&b=2026-09-30&align=delivery) · [Inspect all nine changes](lab/research/curve-repricing.md) · [Open the explorer](https://neurax-jb.github.io/henry-hub-futures-curve/)

## Choose a comparison

| Question | View | How to read it |
| --- | --- | --- |
| How much did the price for a particular delivery month move? | [Curve comparison](https://neurax-jb.github.io/henry-hub-futures-curve/?data=strips&view=curve&a=2026-06-30&b=2026-09-30&align=delivery) | Use **Delivery month** to match the same contract. The change is B minus A. A blank means one observation lacks that contract. |
| How did the front of the curve change shape? | [Contract tenor](https://neurax-jb.github.io/henry-hub-futures-curve/?data=strips&view=curve&a=2026-06-30&b=2026-09-30&align=tenor) | M1 is the first quoted delivery on each date. M1 can represent a different calendar month on each curve. Gaps keep their calendar positions. |
| How much more did March gas cost than April gas? | [March–April, 2027 delivery](https://neurax-jb.github.io/henry-hub-futures-curve/?data=strips&view=spread&year=2027&peer=none) | Subtract April from March on the same observation date. Years align by calendar days before 1 March. Lines connect available pairs. |
| How expensive was an entire winter relative to summer? | [Winter premium on 30 September 2026](https://neurax-jb.github.io/henry-hub-futures-curve/?data=strips&view=winter&date=2026-09-30&winter=2026) | Compare the equal-weight average for November–March with the following April–October average. The premium requires all 12 delivery months. |

## What the archives cover

This edition serves a frozen historical dataset. It has no live price feed or scheduled refresh. All prices are U.S. dollars per million British thermal units (USD/MMBtu).

| Source | Observations | What a row represents |
| --- | --- | --- |
| EIA / NYMEX | 7,012 selected dates, 1 Feb 1994–5 Apr 2024, four nearby contracts per date | A reported settlement by contract rank, with its delivery month reconstructed from checked rolls. Incomplete curves, consecutive identical carry-forwards and observations near unverified rolls were excluded. |
| United States 12 Month Natural Gas Fund / SEC filings | 13 position dates, 29 Sep 2023–30 Sep 2026, 12 contract prices per date | A price reconstructed from a disclosed position and rounded to $0.001/MMBtu. Each filing became public after its position date. |

Keep each comparison within one archive. The four-contract archive cannot supply an entire winter and its following summer on one date. The 12-contract snapshots can when the quoted months cover November through the following October. The source guide gives the reconstruction formula, original references and reuse terms. [Data sources and attribution](DATA_SOURCES.md)

## Import or export data

In **Data notes → Import settlement data**, select a local CSV up to 12 MiB. The following two observations use the bundled January contract.

```csv
date,month,price
2026-06-30,2027-01,4.391
2026-09-30,2027-01,3.752
```

Select those dates as A and B to reproduce the January change. Use ISO dates (`YYYY-MM-DD`), delivery months (`YYYY-MM`) and numeric USD/MMBtu prices. The importer accepts negative prices within ±1,000,000,000 USD/MMBtu. It rejects blank prices, invalid dates, non-finite values and duplicate date/month pairs. Imports stay in the tab until reload. Shared links restore only the bundled archives.

The chart supports the arrow, Home and End keys. Its table contains the numeric observations. CSV exports include every comparison row, its price origin, source links and the source snapshot commit.

## Run locally

From the repository root, start a web server and open `http://localhost:8000/`. The application reads its data locally.

```sh
python -m http.server 8000
```

In a second terminal at the repository root, check the calculations, interface and frozen files.

```sh
node --test tests/*.test.cjs
python scripts/validate.py --static-only
```

[Calculation engine](engine.js) · [Chart rendering](plot.js) · [View controls](app.js) · [Frozen observations](market.js) · [Full validation instructions](VALIDATION.md)

## Project history

This standalone interface uses the curve data extracted from the [Henry Hub Research Lab at the source revision](https://github.com/NeuraX-JB/Henry-Hub-Futures-Curve-Explorer-How-the-Natural-Gas-Market-prices-winter/tree/80c2e5321dadc95aadd4c7f65792fb15f0e2f156). The [snapshot record](SOURCE_SNAPSHOT.json) identifies the source commit and data hash. The [research lab](https://neurax-jb.github.io/Henry-Hub-Futures-Curve-Explorer-How-the-Natural-Gas-Market-prices-winter/lab/) hosts the wider portfolio, including its separately refreshed datasets and forecast ledger.

Research and educational use. Source terms apply, and this edition grants no additional license.
