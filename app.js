/* Views are computed from observed trade-date / delivery-month pairs. */
(() => {
  "use strict";
  const E = globalThis.CurveEngine;
  const $ = id => document.getElementById(id);
  const teal = "#087c76", copper = "#b96837";
  const monthFormat = new Intl.DateTimeFormat("en-US", {month:"short",year:"2-digit", timeZone:"UTC"});
  const dateFormat = new Intl.DateTimeFormat("en-GB", {day:"2-digit",month:"short",year:"numeric",timeZone:"UTC"});
  const mLabel = m => m ? monthFormat.format(new Date(m + "-01T00:00:00Z")).replace(" ", " ’") : "—";
  const dLabel = d => d ? dateFormat.format(new Date(d + "T00:00:00Z")) : "—";
  const price = v => v == null ? "—" : v.toFixed(3);
  const delta = v => v == null ? "—" : (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(3);
  const round = v => v == null ? null : Number(v.toFixed(6));
  const monthIndex = m => Number(m.slice(0,4)) * 12 + Number(m.slice(5)) - 1;
  const monthISO = n => String(Math.floor(n / 12)).padStart(4,"0") + "-" + String(n % 12 + 1).padStart(2,"0");
  const el = (tag, cls, txt) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (txt != null) node.textContent = txt;
    return node;
  };
  const datasets = new Map();
  let active = "strips", view = "curve", exporting = null, userFile = "";
  const params = new URLSearchParams(location.search);
  const views = ["curve","spread","winter"];
  const preferredDataset = {curve:"strips",spread:"archive",winter:"strips"};
  const sourceCommit = "80c2e5321dadc95aadd4c7f65792fb15f0e2f156";
  const ui = {};
  function current() { return datasets.get(active); }
  function state() { return ui[active]; }
  function options(select, entries, chosen) {
    select.replaceChildren(...entries.map(([v, label]) => new Option(label, v, false, String(v) === String(chosen))));
  }
  function dateControl(id, value) {
    const dates = current().dates;
    const sparse = dates.length <= 120;
    let node = $(id);
    if (sparse !== (node.tagName === "SELECT")) {
      const next = document.createElement(sparse ? "select" : "input");
      for (const name of ["id","class","aria-label","aria-describedby","name"]) {
        if (node.hasAttribute(name)) next.setAttribute(name, node.getAttribute(name));
      }
      if (!sparse) next.type = "date";
      node.replaceWith(next);
      node = next;
    }
    if (sparse) options(node, [...dates].reverse().map(d => [d,dLabel(d)]), value);
    else { node.min = dates[0]; node.max = dates.at(-1); }
    node.value = value || "";
  }
  function seasonCandidates(idx, date) {
    const rows = idx.curves.get(date) || [];
    const set = new Set(rows.map(r => {
      const y = Number(r.month.slice(0,4));
      return Number(r.month.slice(5)) >= 11 ? y : y - 1;
    }));
    return [...set].filter(y => y > 0 && y < 9999).sort((a,b) => a-b);
  }
  function completeYears(idx, date) {
    return seasonCandidates(idx,date).filter(y => E.winterPremium(idx,date,y).premium !== null);
  }
  function makeState(idx, key) {
    const d = idx.dates, b = d.at(-1);
    let a = d[Math.max(0,d.length - (key === "archive" ? 6 : 2))];
    if (key === "strips" && d.length > 1) {
      const pair = globalThis.HH_META?.defaultPair;
      if (pair?.every(t => idx.curves.has(t))) a = pair[0];
      if (pair?.every(t => idx.curves.has(t)) && pair[1] !== b) return initial(a,pair[1]);
    }
    return initial(a,b);
    function initial(a,b) {
      const years = E.spreadYears(idx);
      const fy = years.filter(y => E.spread(idx,y).length >= 10);
      const best = fy.length ? fy.at(-1) : years.at(-1);
      const before = years.filter(y=>y<best).at(-1);
      const wd = [...d].reverse().find(date => completeYears(idx,date).length) || b;
      return {a,b,align:"delivery",y:best,peer:before||"",wd,wy:completeYears(idx,wd)[0] || seasonCandidates(idx,wd)[0]};
    }
  }
  function addData(id, rows) {
    const idx = E.indexRows(rows);
    if (!idx.dates.length) throw new Error("This dataset has no observations.");
    datasets.set(id,idx); ui[id] = makeState(idx,id);
  }
  function unpack(obj) {
    return Object.entries(obj).flatMap(([date, quotes]) => Object.entries(quotes).map(([month,price]) => ({date,month,price})));
  }
  function updateURL() {
    if (location.protocol === "file:") return;
    const s=state(), p=new URLSearchParams();
    if (active !== "import") {
      p.set("data",active); p.set("view",view);
      if(view==="curve") {p.set("a",s.a);p.set("b",s.b);p.set("align",s.align);}
      if(view==="spread") {if(s.y)p.set("year",s.y);p.set("peer",s.peer || "none");}
      if(view==="winter") {p.set("date",s.wd);if(s.wy)p.set("winter",s.wy);}
    }
    try {history.replaceState(null,"",location.pathname+(p.size?"?"+p:"")+location.hash);} catch (_) {}
  }
  function restoreURL() {
    if(views.includes(params.get("view"))) view=params.get("view");
    active = datasets.has(params.get("data")) ? params.get("data") : preferredDataset[view];
    preferredDataset[view]=active;
    const s=state(), idx=current();
    for(const [param,key] of [["a","a"],["b","b"],["date","wd"]]) if(idx.curves.has(params.get(param))) s[key]=params.get(param);
    if(params.get("align")==="tenor") s.align="tenor";
    const years=E.spreadYears(idx);
    if(years.includes(Number(params.get("year")))) s.y=Number(params.get("year"));
    if(params.get("peer")==="none") s.peer="";
    else if(years.includes(Number(params.get("peer")))) s.peer=Number(params.get("peer"));
    if(s.peer===s.y) s.peer="";
    const wc=seasonCandidates(idx,s.wd);
    if(wc.includes(Number(params.get("winter")))) s.wy=Number(params.get("winter"));
  }
  function metrics(cards) {
    $("stat-grid").replaceChildren(...cards.map(([label,value,detail])=>{
      const card=el("article","stat-card");
      card.append(el("span","stat-label",label),el("strong","stat-value",value),el("small","stat-detail",detail));
      return card;
    }));
  }
  function chart(title,subtitle,series,config,foot) {
    $("plot-title").textContent=title; $("plot-subtitle").textContent=subtitle;
    $("legend").replaceChildren(...series.map((s,i)=>{
      const item=el("span","item");
      const swatch=el("i");
      swatch.style.setProperty("--swatch",s.color);
      swatch.style.cssText += ";display:inline-block;width:21px;height:0;border-radius:0;background:none;border-top:3px "+(i?"dashed":"solid")+" "+s.color;
      item.append(swatch,document.createTextNode(s.name));return item;
    }));
    globalThis.CurvePlot.draw($("plot"),{series,formatValue:price,...config});
    $("chart-foot").textContent=foot;
  }
  function table(title, headers, rows, expHeaders, expRows, filename) {
    $("table-title").textContent=title;
    const wrap=$("table-wrap"), t=el("table"), head=el("thead"), body=el("tbody");
    t.append(el("caption","sr-only",title+". Prices and differences are in USD per MMBtu."));
    const hr=el("tr");
    for(const h of headers){const cell=el("th","",h);cell.scope="col";hr.append(cell);}
    head.append(hr);t.append(head,body);wrap.replaceChildren(t);
    let visible=0;
    const more=el("button","more-rows");
    function append(count) {
      const end=Math.min(visible+count,rows.length);
      for(;visible<end;visible++){
        const tr=el("tr");
        rows[visible].forEach((value,i)=>{const cell=el(i===0?"th":"td","",value);if(i===0)cell.scope="row";tr.append(cell);});
        body.append(tr);
      }
      if(visible<rows.length){more.textContent="Show "+Math.min(50,rows.length-visible)+" more rows ("+visible+" of "+rows.length+")";if(!more.parentNode)wrap.append(more);}
      else more.remove();
    }
    more.onclick=()=>{
      const firstNew=visible;
      append(50);
      const row=body.children[firstNew];
      if(row){row.tabIndex=-1;row.focus();}
    };
    append(12);
    const sources=active==="archive"?"https://www.eia.gov/dnav/ng/ng_pri_fut_s1_d.htm":active==="import"?"User input":"";
    const provenance=active==="archive"?"EIA daily archive":active==="strips"?"Reconstructed SEC holdings":"Imported file: "+userFile;
    const exportRows=expRows.map(row=>{
      const dates=expHeaders.flatMap((h,i)=>/^date(?:_[ab])?$/.test(h)?[row[i]]:[]);
      const urls=sources||[...new Set(dates.map(d=>globalThis.HH_META.sources[d]).filter(Boolean))].join(" | ");
      return [...row,active,provenance,urls,active==="import"?"":sourceCommit];
    });
    exporting=expRows.length?{headers:[...expHeaders,"dataset","price_origin","source_urls","source_snapshot_commit"],rows:exportRows,filename}:null;
    $("export").disabled=!exporting;
  }
  function clearView(reason) {
    metrics([["Observations","—","No selection"],["Matched prices","—","No comparison"],["Spread","—","USD / MMBtu"]]);
    chart("No observations",reason,[],{labels:[],empty:reason},"Choose an available observation to continue.");
    table("Observations",["Observation","Price"],[],[],[],"");
  }
  function nearest(idx,bad) {
    if(!bad) return [idx.dates[0],idx.dates.at(-1)];
    let lo=0,hi=idx.dates.length;
    while(lo<hi){const mid=(lo+hi)>>1;if(idx.dates[mid]<bad)lo=mid+1;else hi=mid;}
    return [idx.dates[lo-1],idx.dates[lo]].filter(Boolean);
  }
  function selectionOK(keys) {
    const hint=$("input-hint"); hint.replaceChildren();hint.hidden=true;
    const controls={a:"date-a",b:"date-b",wd:"winter-date"};
    for(const key of keys){$(controls[key]).removeAttribute("aria-invalid");$(controls[key]).setAttribute("aria-describedby","input-hint");}
    for(const key of keys){
      const value=state()[key];
      if(current().curves.has(value))continue;
      $(controls[key]).setAttribute("aria-invalid","true");
      const why=(value?dLabel(value)+": ":"")+"no observation in this dataset.";
      hint.hidden=false;hint.append(document.createTextNode(why+" Available dates: "));
      for(const d of nearest(current(),value)){
        const btn=el("button","",dLabel(d));btn.type="button";
        btn.onclick=()=>{state()[key]=d;render();};hint.append(btn);
      }
      clearView("Select an available date to see the curve."); return false;
    }
    return true;
  }
  function curveView() {
    const s=state(),idx=current();
    dateControl("date-a",s.a);dateControl("date-b",s.b);$("align").value=s.align;
    if(!selectionOK(["a","b"]))return;
    const out=E.compare(idx,s.a,s.b,s.align);
    const firstA=idx.curves.get(s.a)[0],firstB=idx.curves.get(s.b)[0];
    const paired=out.filter(r=>r.change!==null);
    const avg=paired.length?paired.reduce((sum,r)=>sum+r.change,0)/paired.length:null;
    const byMonth=s.align==="delivery";
    metrics([["Curve A · first month",price(firstA.price),mLabel(firstA.month)+" delivery"],["Curve B · first month",price(firstB.price),mLabel(firstB.month)+" delivery"],["Mean change · B − A",delta(avg),paired.length+" matched "+(byMonth?"delivery month":"tenor")+(paired.length===1?"":"s")]]);
    let plotRows=out;
    const first=byMonth?monthIndex(out[0].key):out[0].key,last=byMonth?monthIndex(out.at(-1).key):out.at(-1).key;
    if(last-first<=600) {
      const map=new Map(out.map(r=>[byMonth?monthIndex(r.key):r.key,r]));
      plotRows=Array.from({length:last-first+1},(_,i)=>map.get(first+i)||{key:byMonth?monthISO(first+i):first+i,priceA:null,priceB:null});
    }
    const series=[{name:"A · "+dLabel(s.a),color:teal,values:plotRows.map(r=>r.priceA)},{name:"B · "+dLabel(s.b),color:copper,values:plotRows.map(r=>r.priceB)}];
    const labels=plotRows.map(r=>byMonth?mLabel(r.key):"M"+r.key);
    chart("Futures curve",byMonth?"Settlement by delivery month":"Settlement by distance from the first listed month",series,
      {labels,xPositions:plotRows.map(r=>byMonth?monthIndex(r.key):r.key),xLabel:byMonth?"Delivery month":"Contract tenor",yLabel:"USD / MMBtu"},
      !paired.length?"These dates have no shared delivery months. Select contract tenor to compare curve shapes.":byMonth?"Changes use only delivery months with a price on both dates. A blank means the contract is outside that snapshot.":"M1 is the first listed delivery month on each date. The same tenor can represent different delivery months.");
    table("Contract comparison",byMonth?["Delivery month","Curve A","Curve B","B − A"]:["Tenor","A delivery","B delivery","Curve A","Curve B","B − A"],
      out.map(r=>byMonth?[mLabel(r.key),price(r.priceA),price(r.priceB),delta(r.change)]:["M"+r.key,mLabel(r.monthA),mLabel(r.monthB),price(r.priceA),price(r.priceB),delta(r.change)]),
      ["date_a","date_b","alignment","key","delivery_a","delivery_b","price_a_usd_mmbtu","price_b_usd_mmbtu","change_b_minus_a_usd_mmbtu"],
      out.map(r=>[s.a,s.b,s.align,r.key,r.monthA,r.monthB,r.priceA,r.priceB,round(r.change)]),"curve_"+s.a+"_"+s.b);
  }
  function spreadView() {
    const s=state(), idx=current(),years=E.spreadYears(idx).reverse();
    options($("year-main"),years.map(y=>[y,String(y)]),s.y);
    options($("year-peer"),[["","No overlay"],...years.filter(y=>y!==s.y).map(y=>[y,String(y)])],s.peer);
    if(!years.length){clearView("This dataset has no March and April prices observed together for the same delivery year.");return;}
    const selected=[s.y,...(s.peer?[s.peer]:[])], buckets=selected.map(y=>E.spread(idx,y));
    const primary=buckets[0],last=primary.at(-1);
    metrics([["Latest March − April",delta(last.spread),dLabel(last.date)],["Lowest spread",delta(Math.min(...primary.map(r=>r.spread))),s.y+" delivery"],["Highest spread",delta(Math.max(...primary.map(r=>r.spread))),primary.length+" paired observations"]]);
    const days=[...new Set(buckets.flatMap(b=>b.map(r=>r.daysToMarch)))].sort((a,b)=>b-a);
    const series=buckets.map((rows,i)=>{
      const map=new Map(rows.map(r=>[r.daysToMarch,r.spread]));
      return {name:selected[i]+" delivery",color:i?copper:teal,values:days.map(d=>map.get(d)??null)};
    });
    chart("March–April spread","March settlement minus April settlement for the same delivery year",series,
      {labels:days.map(String),xPositions:days.map(d=>-d),zero:true,connectNulls:true,xLabel:"Calendar days before 1 March",yLabel:"USD / MMBtu",formatValue:delta},
      "Winters align by days before 1 March. Positive values mean March traded above April. Lines connect observed pairs.");
    const all=selected.flatMap((y,i)=>[...buckets[i]].reverse().map(r=>[y,r]));
    table("Spread observations",["Delivery year","Observation","Days to March","March","April","Mar − Apr"],all.map(([y,r])=>[y,dLabel(r.date),r.daysToMarch,price(r.march),price(r.april),delta(r.spread)]),
      ["delivery_year","date","days_to_march_1","march_usd_mmbtu","april_usd_mmbtu","march_minus_april_usd_mmbtu"],
      all.map(([y,r])=>[y,r.date,r.daysToMarch,r.march,r.april,round(r.spread)]),"march_april_"+selected.join("_"));
  }
  function winterView() {
    const s=state(),idx=current();
    dateControl("winter-date",s.wd);
    if(!selectionOK(["wd"]))return;
    const years=seasonCandidates(idx,s.wd),complete=completeYears(idx,s.wd);
    if(!years.includes(s.wy)) s.wy=complete[0]||years[0];
    if(!s.wy){clearView("There is no seasonal strip for this date.");return;}
    options($("winter-year"),years.map(y=>[y,y+" / "+(y+1)+(complete.includes(y)?"":" · partial")]),s.wy);
    const prem=E.winterPremium(idx,s.wd,s.wy);
    const points=E.seasonMonths(s.wy);
    const map=new Map(idx.curves.get(s.wd).map(r=>[r.month,r.price]));
    metrics([["Winter average",price(prem.winterMean),prem.winterCount+" of 5 months · Nov–Mar"],["Summer average",price(prem.summerMean),prem.summerCount+" of 7 months · Apr–Oct"],["Winter premium",delta(prem.premium),prem.premium===null?"Requires all 12 contracts":"Winter minus following summer"]]);
    const series=["Winter · Nov–Mar","Summer · Apr–Oct"].map((name,k)=>({name,color:k?copper:teal,values:points.map((m,i)=>(i<5)===(k===0)?map.get(m)??null:null)}));
    chart("Winter premium","Monthly prices on "+dLabel(s.wd)+" for winter "+s.wy+" and the following summer",series,
      {labels:points.map(mLabel),xLabel:"Delivery month",yLabel:"USD / MMBtu"},
      prem.premium===null?"This observation has an incomplete strip. Select a complete season or a long-dated snapshot to calculate the premium.":"Each delivery month has equal weight. The premium is the five-month winter average minus the seven-month summer average.");
    const raw=points.map((m,i)=>[s.wd,m,i<5?"Winter":"Summer",map.get(m)??null]);
    table("Seasonal contracts",["Delivery month","Season","Price"],raw.map(r=>[mLabel(r[1]),r[2],price(r[3])]),
      ["date","delivery_month","season","price_usd_mmbtu","winter_mean","summer_mean","winter_minus_summer_usd_mmbtu"],
      raw.map(r=>[...r,round(prem.winterMean),round(prem.summerMean),round(prem.premium)]),"winter_"+s.wy+"_"+s.wd);
  }
  function presets() {
    const box=$("presets"), idx=current(), s=state();
    box.replaceChildren();
    const choices=[];
    const dates=idx.dates;
    const curve=(label,a,b)=>{if(idx.curves.has(a)&&idx.curves.has(b)) choices.push([label,{a,b}]);};
    if(view==="curve"){
      if(active==="archive"){
        curve("Last 6 archived observations",dates.at(-6),dates.at(-1));
        curve("Texas freeze · 2021","2021-02-12","2021-02-17");
        curve("January roll · 2024","2024-01-25","2024-01-30");
      } else if(active==="strips"){
        curve("Latest quarters",dates.at(-2),dates.at(-1));
        curve("2024 winter curve","2024-06-28","2024-09-30");
        curve("2025 winter curve","2025-06-30","2025-09-30");
      } else if(dates.length>1){
        curve("Latest pair",dates.at(-2),dates.at(-1));
        curve("First vs last",dates[0],dates.at(-1));
      }
    } else if(view==="spread"&&active==="archive"){
      const years=E.spreadYears(idx);
      for(const [y,peer] of [[2024,2023],[2021,2020],[2014,2013]]) if(years.includes(y)&&years.includes(peer)) choices.push([y+" vs "+peer,{y,peer}]);
    } else if(view==="winter"&&active==="strips"){
      for(const date of [...dates].reverse().filter(d=>completeYears(idx,d).length).slice(0,3)){
        const y=completeYears(idx,date)[0];
        choices.push(["Winter "+y+"–"+String(y+1).slice(-2),{wd:date,wy:y}]);
      }
    }
    if(choices.length) box.append(el("span","preset-label","Examples"));
    for(const [label,values] of choices){
      const button=el("button","",label);button.type="button";
      const on=Object.entries(values).every(([k,v])=>s[k]===v);
      button.classList.toggle("selected",on);button.setAttribute("aria-pressed",String(on));
      button.onclick=()=>{Object.assign(s,values);render();};box.append(button);
    }
  }
  function notes() {
    const root=$("data-origin"), meta=globalThis.HH_META;
    root.replaceChildren();
    const section=(name,description)=>{
      const sec=el("section");sec.append(el("h3","",name),el("p","",description));root.append(sec);return sec;
    };
    const link=(parent,txt,href,download=false)=>{
      const a=el("a","",txt);a.href=href;
      if(download)a.download="";else{a.target="_blank";a.rel="noopener noreferrer";}
      parent.append(a);return a;
    };
    const a=section("Daily archive · EIA / NYMEX","The four nearest Henry Hub futures settlements come from EIA’s NYMEX series. EIA publishes ranks, so delivery months are reconstructed using checked expiration dates. This edition omits incomplete curves, consecutive identical carry-forwards and observations near an unverified roll.");
    link(a,"EIA daily series","https://www.eia.gov/dnav/ng/ng_pri_fut_s1_d.htm");a.append(" · ");
    link(a,"Definitions and source","https://www.eia.gov/dnav/ng/tbldefs/ng_pri_fut_tbldef2.asp");
    const b=section("Quarter-end snapshots · SEC filings","Each snapshot reconstructs 12 contract prices from the United States 12 Month Natural Gas Fund’s long NYMEX positions. For each month, add signed unrealized gain or loss to the original notional, then divide by the number of contracts times 10,000 MMBtu. Round to $0.001/MMBtu. An observation uses the last trading day of the quarter. The filings became public later.");
    const details=el("details"), summary=el("summary","","Source filing for each observation");details.append(summary);
    const list=el("ul"); for(const [date,url] of Object.entries(meta.sources).sort((a,b)=>b[0].localeCompare(a[0]))){
      const li=el("li");link(li,dLabel(date)+" · fund filing",url);list.append(li);
    } details.append(list);b.append(details);
    const m=section("How the comparisons work","Delivery-month alignment pairs identical contracts. Tenor alignment starts each observed curve at M1. Price changes are curve B minus curve A. March–April uses two contracts seen on the same date. Winter premium uses the simple mean of November–March minus the following April–October; it requires all twelve months.");
    link(m,"Download the project guide","README.md",true);
  }
  function render() {
    const idx=current(),s=state();
    $("dataset").value=active;
    for(const v of views){
      $("tab-"+v).classList.toggle("active",v===view);$("tab-"+v).setAttribute("aria-pressed",String(v===view));
      $(v+"-controls").hidden=v!==view;
    }
    $("input-hint").hidden=true;$("input-hint").replaceChildren();
    $("status").textContent="";
    $("source-status").textContent=active==="archive"?"NYMEX via EIA · four nearby contracts":active==="strips"?"SEC fund filings · reconstructed prices":"Imported CSV · "+userFile;
    $("coverage").textContent=idx.dates.length.toLocaleString("en-US")+" observation dates · "+dLabel(idx.dates[0])+" – "+dLabel(idx.dates.at(-1));
    $("snapshot-status").textContent=active==="import"?"Local CSV · user-supplied observations · retained in this tab until reload":
      "Historical snapshot · selected archive ends "+dLabel(idx.dates.at(-1))+" · no live price feed or automatic updates";
    $("reset-import").hidden=!datasets.has("import");
    if(view==="curve")curveView();else if(view==="spread")spreadView();else winterView();
    if(active==="strips"&&$("plot-title").textContent!=="No observations") $("plot-subtitle").append(" · Reconstructed from SEC holdings");
    presets();updateURL();
  }
  function setView(v) {
    if(v!==view&&active!=="import") active=preferredDataset[v];
    view=v;render();
  }
  function setupEvents(){
    for(const v of views)$("tab-"+v).onclick=()=>setView(v);
    $("dataset").onchange=e=>{if(datasets.has(e.target.value)){active=e.target.value;if(active!=="import")preferredDataset[view]=active;render();}};
    $("swap").onclick=()=>{const s=state();[s.a,s.b]=[s.b,s.a];render();};
    const fields={"date-a":"a","date-b":"b","align":"align","year-main":"y","year-peer":"peer","winter-date":"wd","winter-year":"wy"};
    document.addEventListener("change",event=>{
      const key=fields[event.target.id];if(!key)return;
      const s=state(),val=event.target.value;
      s[key]=["y","peer","wy"].includes(key)&&val ? Number(val):val;
      if(key==="y"&&s.y===s.peer)s.peer="";
      if(key==="wd"){const ys=completeYears(current(),s.wd);s.wy=ys[0]||seasonCandidates(current(),s.wd)[0];}
      render();
    });
    for(const id of ["open-notes","notes-secondary"]) $(id).onclick=()=>$("data-notes").showModal();
    $("data-notes").addEventListener("click",e=>{if(e.target===$("data-notes")){const b=e.target.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)e.target.close();}});
    $("export").onclick=()=>{
      if(!exporting)return;
      const url=URL.createObjectURL(new Blob([E.csv(exporting.headers,exporting.rows)],{type:"text/csv;charset=utf-8"}));
      const a=el("a");a.href=url;a.download="henry_hub_"+active+"_"+exporting.filename+".csv";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
    };
    const feedback=el("p","import-feedback");feedback.setAttribute("role","status");$("import").parentNode.after(feedback);
    let request=0;
    $("import").onchange=async e=>{
      const file=e.target.files[0];if(!file)return;
      const seq=++request;
      try{
        if(file.size>12*1024*1024)throw new Error("Choose a CSV smaller than 12 MB.");
        const source=await file.text();if(seq!==request)return;
        const rows=E.parseCSV(source);
        addData("import",rows);userFile=file.name;
        let opt=$("dataset").querySelector('[value="import"]');
        if(!opt){opt=new Option("Imported CSV","import");$("dataset").append(opt);}
        active="import";view="curve";render();
        feedback.textContent=rows.length.toLocaleString()+" observations imported.";
        $("data-notes").close();$("status").textContent=feedback.textContent+" Available in this tab until you reload.";
      } catch(err){if(seq===request)feedback.textContent=err.message;}
      finally{if(seq===request)e.target.value="";}
    };
    $("reset-import").onclick=()=>{
      request++;datasets.delete("import");delete ui.import;userFile="";
      $("dataset").querySelector('[value="import"]')?.remove();if(active==="import")active=view==="spread"?"archive":"strips";
      feedback.textContent="Imported observations removed.";render();
    };
  }
  async function init() {
    try {
      const bundled=globalThis.HH_BUNDLED;
      globalThis.HH_META=bundled.meta;
      addData("archive",unpack(bundled.archive));addData("strips",unpack(bundled.strips));
      $("dataset").querySelector('[value="strips"]').textContent="Quarter-end curves · SEC";
      restoreURL();notes();setupEvents();render();
    }catch(err){
      $("status").textContent="The explorer could not load its local data. Reload the page; if this persists, see README.md for the local-server instructions.";
      const guide=el("a","","Read setup instructions.");guide.href="README.md";$("status").append(" ",guide);
      $("export").disabled=true;
      console.error(err);
    }
  }
  init();
})();

