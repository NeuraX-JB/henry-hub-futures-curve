"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const E=require("../engine.js");
require("../market.js");
const rows=object=>Object.entries(object).flatMap(([date,quotes])=>Object.entries(quotes).map(([month,price])=>({date,month,price})));

test("frozen data bytes and published repricing results remain unchanged",()=>{
  const hash=crypto.createHash("sha256").update(fs.readFileSync(path.join(__dirname,"../market.js"))).digest("hex");
  assert.equal(hash,"a507fae5786ac12369e06fc8edb176754bdafa3d73b51c2c9ebacb9f8ddb5829");
  const index=E.indexRows(rows(globalThis.HH_BUNDLED.strips));
  const january=E.compare(index,"2026-06-30","2026-09-30").find(row=>row.key==="2027-01");
  assert.equal(january.priceA,4.391);assert.equal(january.priceB,3.752);
  assert.ok(Math.abs(january.change+.639)<1e-12);
  assert.equal(E.indexRows(rows(globalThis.HH_BUNDLED.archive)).dates.length,7012);
});

test("CSV keeps quoted fields, physical error lines, negative prices and calendar validity",()=>{
  const parsed=E.parseCSV('\uFEFFdate,month,price\r\n"2024-02-29",2024-03,-2.5\r\n');
  assert.deepEqual(parsed,[{date:"2024-02-29",month:"2024-03",price:-2.5}]);
  assert.throws(()=>E.parseCSV("date,month,price\n2023-02-29,2023-03,2"),/CSV line 2.*valid date/);
  assert.throws(()=>E.parseCSV("date,month,price\n2024-02-29,2024-03,2\n2024-02-29,2024-03,3"),/duplicates/);
  assert.throws(()=>E.parseCSV('date,month,price,note\n2024-02-29,2024-03,2,"two\nlines"\n2024-03-01,2024-04,nope,x'),/CSV line 4/);
});

test("finite extreme imports cannot overflow spreads or chart ranges",()=>{
  for(const price of [1e308,-1e308])assert.throws(()=>E.indexRows([{date:"2025-01-01",month:"2025-03",price}]),/supported price range/);
  assert.throws(()=>E.parseCSV("date,month,price\n2025-01-01,2025-03,1e308"),/supported price range/);
  const index=E.indexRows([{date:"2025-01-01",month:"2025-03",price:1e9},{date:"2025-01-01",month:"2025-04",price:-1e9}]);
  assert.equal(E.spread(index,2025)[0].spread,2e9);
});

test("tenor alignment preserves absent calendar months",()=>{
  const index=E.indexRows([{date:"2025-01-01",month:"2025-02",price:2},{date:"2025-01-01",month:"2025-04",price:3},{date:"2025-02-01",month:"2025-03",price:4},{date:"2025-02-01",month:"2025-04",price:5}]);
  assert.deepEqual(E.compare(index,"2025-01-01","2025-02-01","tenor").map(r=>[r.key,r.change]),[[1,2],[2,null],[3,null]]);
});

test("year 0001 winter retains padded labels and the same seasonal calculation",()=>{
  const months=E.seasonMonths(1);
  assert.equal(months[0],"0001-11");assert.equal(months[2],"0002-01");assert.equal(months.at(-1),"0002-10");
  assert.equal(months.length,12);
  const index=E.indexRows(months.map((month,i)=>({date:"0001-09-01",month,price:i<5?4:3})));
  assert.equal(E.winterPremium(index,"0001-09-01",1).premium,1);
  for(const year of [0,9999,2.5])assert.throws(()=>E.seasonMonths(year),/Invalid winter/);
  assert.equal(E.winterPremium(E.indexRows(rows(globalThis.HH_BUNDLED.strips)),"2025-09-30",2025).winterCount,5);
});
