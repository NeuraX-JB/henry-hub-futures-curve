# One benchmark, different delivery months

**John Barreto · Henry Hub Research · Note 002 · 23 November 2026 · Table and spread calculation added 24 November 2026**

Between the June and September 2026 position dates, **January 2027 gas fell $0.639/MMBtu and July 2027 gas fell $0.160/MMBtu**. All nine contracts seen on both dates declined. The size of the decline depended on which month's gas the contract delivered.

[Open this comparison with both dates selected](https://neurax-jb.github.io/henry-hub-futures-curve/?data=strips&view=curve&a=2026-06-30&b=2026-09-30&align=delivery)

## Comparing the same contract twice

The June holdings cover August 2026 through July 2027. The September holdings cover November 2026 through October 2027. Matching the calendar labels yields nine common delivery months. Prices below are reconstructed from United States 12 Month Natural Gas Fund positions, in U.S. dollars per million British thermal units. The change subtracts 30 June from 30 September.

| Delivery month | 30 Jun 2026 | 30 Sep 2026 | Change (USD/MMBtu) |
| --- | ---: | ---: | ---: |
| 2026-11 | 3.393 | 3.026 | −0.367 |
| 2026-12 | 3.980 | 3.370 | −0.610 |
| 2027-01 | 4.391 | 3.752 | −0.639 |
| 2027-02 | 3.959 | 3.428 | −0.531 |
| 2027-03 | 3.155 | 2.763 | −0.392 |
| 2027-04 | 2.942 | 2.664 | −0.278 |
| 2027-05 | 2.917 | 2.693 | −0.224 |
| 2027-06 | 3.046 | 2.852 | −0.194 |
| 2027-07 | 3.255 | 3.095 | −0.160 |

A front-month comparison would pair August 2026 with November 2026. Holding January 2027 fixed instead measures how the price of that same delivery changed.

## What happened to the March–April spread?

March fell $0.392/MMBtu while April fell $0.278/MMBtu. March's premium over April narrowed from **$0.213 to $0.099/MMBtu**, a change of −$0.114/MMBtu. Both legs fell, and March fell further. [Inspect the 2027 March–April observations](https://neurax-jb.github.io/henry-hub-futures-curve/?data=strips&view=spread&year=2027&peer=none)

These quarter-end positions show two points in time. They leave the intervening price path unobserved and cannot attribute the change to weather, storage or another driver. Their public filing dates came after the position dates. The explorer's separate EIA archive covers four nearby contracts and uses a different construction method.

## Check the calculation

1. Open the linked comparison and find the January 2027 table row. Subtract the June price of 4.391 from the September price of 3.752.
2. Use the export control to obtain the full comparison. Rows with only one observed leg have no calculated change.
3. Check the source holdings in the fund’s [June 2026 filing](https://www.sec.gov/Archives/edgar/data/1405513/000110465926092634/unl-20260630x10q.htm) and [September 2026 filing](https://www.sec.gov/Archives/edgar/data/1405513/000110465926123997/unl-20260930x10q.htm). The [source guide](../../DATA_SOURCES.md) gives the reconstruction formula, and the [frozen data](../../market.js) contain the observations used here.

[Research lab](https://neurax-jb.github.io/Henry-Hub-Futures-Curve-Explorer-How-the-Natural-Gas-Market-prices-winter/lab/) · [Project guide](../../README.md)
