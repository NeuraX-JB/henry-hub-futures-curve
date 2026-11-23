# Henry Hub Futures Curve Explorer

**John Barreto · Independent natural gas research**

Analyze historical Henry Hub futures curves, delivery-month repricing, winter premiums and calendar spreads.

**[Open the live project](https://neurax-jb.github.io/Henry-Hub-Futures-Curve-Explorer-How-the-Natural-Gas-Market-prices-winter/) · [Research portfolio](https://neurax-jb.github.io/Henry-Hub-Futures-Curve-Explorer-How-the-Natural-Gas-Market-prices-winter/lab/)**

**Methods and tools:** JavaScript, HTML/CSS, commodity futures analysis.

## Research question
How does the natural gas market reprice individual delivery months and seasonal spreads over time?

The explorer compares curves from the EIA four-contract historical archive and longer snapshots reconstructed from SEC filings. These sources have different coverage and should not be combined into an assumed continuous settlement history.

## Methods and evidence
- [Interactive application and embedded source notes](index.html)
- [Research note on delivery-month repricing](lab/research/curve-repricing.md)
- [Example: compare June and September 2026 snapshots](https://neurax-jb.github.io/Henry-Hub-Futures-Curve-Explorer-How-the-Natural-Gas-Market-prices-winter/?data=strips&view=curve&a=2026-06-30&b=2026-09-30&align=delivery)

## Run locally
Serve the root with `python -m http.server 8000` and visit `http://localhost:8000/`. The application includes its historical price snapshots.

## Source and publication

This repository is a project-specific snapshot of the [canonical research lab](https://github.com/NeuraX-JB/Henry-Hub-Futures-Curve-Explorer-How-the-Natural-Gas-Market-prices-winter). The live site and automated updates remain there, so the existing website and forecast ledger are preserved. Check the [source and attribution notes](DATA_SOURCES.md) before reusing third-party data. No new license is granted. Research and educational use; not investment advice.
