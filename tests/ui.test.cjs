"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {createDOM}=require("./dom.cjs");
const read=name=>fs.readFileSync(path.join(__dirname,"..",name),"utf8");
function boot(search="",plot=false){
  const {document,Option}=createDOM(read("index.html"));
  const errors=[],blobs=[],observers=[],frames=[];
  const context=vm.createContext({document,Option,URLSearchParams,Blob,Intl,
    location:{search,protocol:"https:",pathname:"/curve/",hash:""},history:{replaceState(){}},
    URL:{createObjectURL(blob){blobs.push(blob);return "blob:test";},revokeObjectURL(){}},
    console:{error:error=>errors.push(error)},setTimeout(){return 1;},clearTimeout(){},
    requestAnimationFrame(fn){frames.push(fn);return frames.length;},cancelAnimationFrame(){},
    ResizeObserver:class{constructor(callback){this.callback=callback;observers.push(this);}observe(){}},
    CurvePlot:{draw(){}}
  });
  for(const file of ["market.js","engine.js",...(plot?["plot.js"]:[]),"app.js"])vm.runInContext(read(file),context,{filename:file});
  assert.deepEqual(errors,[]);
  return {context,document,blobs,observers,frames};
}

test("spread-only links choose the daily archive while explicit datasets are respected",()=>{
  assert.equal(boot("?view=spread").document.getElementById("dataset").value,"archive");
  assert.equal(boot("?view=spread&data=strips").document.getElementById("dataset").value,"strips");
  assert.equal(boot("?view=winter&data=unknown").document.getElementById("dataset").value,"strips");
});

test("an older failed file read cannot overwrite the latest successful import",async()=>{
  const {document}=boot();let rejectOld;
  const old={name:"old.csv",size:5,text:()=>new Promise((_,reject)=>{rejectOld=reject;})};
  const input=document.getElementById("import");
  const first=input.onchange({target:{files:[old],value:"old"}});
  await input.onchange({target:{files:[{name:"new.csv",size:90,text:async()=>"date,month,price\n2025-01-01,2025-03,2\n2025-01-02,2025-03,3"}],value:"new"}});
  rejectOld(Error("Old read failed"));await first;
  assert.equal(document.querySelector(".import-feedback").textContent,"2 observations imported.");
  assert.equal(document.getElementById("dataset").value,"import");
});

test("an accepted year 0001 import renders all twelve seasonal contracts",async()=>{
  const {document,context}=boot();
  const csv="date,month,price\n"+context.CurveEngine.seasonMonths(1).map((month,i)=>"0001-09-01,"+month+","+(i<5?4:3)).join("\n");
  await document.getElementById("import").onchange({target:{files:[{name:"early-years.csv",size:csv.length,text:async()=>csv}],value:"early"}});
  document.getElementById("tab-winter").click();
  const rows=document.getElementById("table-wrap").querySelector("tbody").children;
  assert.equal(rows.length,12);assert.equal(rows[0].children[2].textContent,"4.000");
  assert.equal(rows[11].children[2].textContent,"3.000");
  assert.equal(document.getElementById("plot-title").textContent,"Winter premium");
});

test("pagination moves keyboard focus to the first newly revealed row, including the last page",()=>{
  const {document}=boot("?view=spread");
  const wrap=document.getElementById("table-wrap"),body=wrap.querySelector("tbody");
  assert.equal(body.children.length,12);
  for(let button=wrap.querySelector(".more-rows");button;button=wrap.querySelector(".more-rows")){
    const previous=body.children.length;button.focus();button.click();
    assert.equal(document.activeElement,body.children[previous]);
    assert.equal(body.children[previous].children[0].scope,"row");
  }
  assert.ok(wrap.querySelector("caption").textContent.includes("USD per MMBtu"));
});

test("chart resize keeps focused point, and the spoken value includes both axis units",()=>{
  const {document,observers,frames}=boot("",true);
  const plot=document.getElementById("plot");let svg=plot.querySelector("svg");
  svg.focus();svg.dispatchEvent({type:"keydown",key:"ArrowRight"});
  const before=plot.querySelector('[role="status"]').textContent;
  assert.match(before,/USD \/ MMBtu/);assert.match(before,/Delivery month/);
  observers[0].callback([{contentRect:{width:320}}]);frames.splice(0).forEach(fn=>fn());
  svg=plot.querySelector("svg");assert.equal(document.activeElement,svg);
  assert.equal(plot.querySelector('[role="status"]').textContent,before);
});

test("unavailable dates expose a linked invalid state and clear it after correction",()=>{
  const {document}=boot("?data=archive");
  let input=document.getElementById("date-a");input.value="2024-04-06";
  document.dispatchEvent({type:"change",target:input});
  assert.equal(input.getAttribute("aria-invalid"),"true");
  assert.equal(input.getAttribute("aria-describedby"),"input-hint");
  input.value="2024-04-05";document.dispatchEvent({type:"change",target:input});
  assert.equal(input.getAttribute("aria-invalid"),null);
});

test("CSV exports carry the original SEC filing URLs and snapshot commit",async()=>{
  const {document,blobs}=boot("?data=strips&view=curve&a=2026-06-30&b=2026-09-30");
  document.getElementById("export").click();const csv=await blobs[0].text();
  assert.match(csv.split("\r\n")[0],/dataset,price_origin,source_urls,source_snapshot_commit$/);
  assert.match(csv,/unl-20260630x10q\.htm/);assert.match(csv,/unl-20260930x10q\.htm/);
  assert.match(csv,/80c2e5321dadc95aadd4c7f65792fb15f0e2f156/);
});
