/* Henry Hub Futures Curve Explorer. Dates and delivery months are ISO calendar labels. */
(function (scope) {
  "use strict";

  const dateHeader = ["date", "trade_date", "trading_date", "observation_date", "quote_date", "settlement_date", "as_of", "as_of_date"];
  const monthHeader = ["month", "delivery_month", "contract_month", "delivery", "contract"];
  const priceHeader = ["price", "settle", "settlement", "settle_price", "settlement_price", "settlement_usd_mmbtu", "price_usd_mmbtu", "usd_mmbtu"];
  const numericPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
  // Keep three-decimal quote arithmetic and chart ranges inside a useful numeric range.
  const MAX_ABS_PRICE = 1e9;

  function validMonth(value) {
    return typeof value === "string" && /^[0-9]{4}-(0[1-9]|1[0-2])$/.test(value) && !value.startsWith("0000-");
  }

  function validDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !validMonth(value.slice(0, 7))) return false;
    const day = Number(value.slice(8));
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(5, 7));
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const monthLengths = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return day >= 1 && day <= monthLengths[month - 1];
  }

  // Preserve CSV physical line numbers so errors also identify multiline records.
  function readRecords(input) {
    const source = String(input).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
    const records = [];
    let fields = [], field = "", quoted = false, closed = false;
    let line = 1, start = 1;

    function finishRecord() {
      fields.push(field);
      if (fields.length > 1 || fields[0].trim() !== "") records.push({ values: fields, line: start });
      fields = [];
      field = "";
      closed = false;
    }

    for (let i = 0; i < source.length; i += 1) {
      const c = source[i];
      if (quoted) {
        if (c === '"' && source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else if (c === '"') {
          quoted = false;
          closed = true;
        } else {
          field += c;
          if (c === "\n") line += 1;
        }
      } else if (c === ",") {
        fields.push(field);
        field = "";
        closed = false;
      } else if (c === "\n") {
        finishRecord();
        line += 1;
        start = line;
      } else if (closed && c.trim() !== "") {
        throw new Error("Unexpected character after a closing quote on CSV line " + line + ".");
      } else if (c === '"') {
        if (field.trim() !== "") throw new Error("Unexpected quote on CSV line " + line + ".");
        field = "";
        quoted = true;
      } else if (!closed) {
        field += c;
      }
    }
    if (quoted) throw new Error("Unclosed quoted field beginning on CSV line " + start + ".");
    finishRecord();
    return records;
  }

  function validateRow(row, label, seen) {
    if (!row || !validDate(row.date)) throw new Error(label + " needs a valid date in YYYY-MM-DD format.");
    if (!validMonth(row.month)) throw new Error(label + " needs a valid delivery month in YYYY-MM format.");
    if (!Number.isFinite(row.price)) throw new Error(label + " needs a finite numeric price.");
    if (Math.abs(row.price) > MAX_ABS_PRICE) throw new Error(label + " exceeds the supported price range of ±1,000,000,000 USD/MMBtu.");
    const key = row.date + "/" + row.month;
    if (seen.has(key)) throw new Error(label + " duplicates " + row.date + " and " + row.month + ".");
    seen.add(key);
  }

  function parseCSV(text) {
    const records = readRecords(text);
    if (records.length === 0) throw new Error("The CSV is empty.");
    const headers = records[0].values.map(value => value.trim().toLowerCase().replace(/[\s-]+/g, "_"));
    function column(aliases, label) {
      const matches = headers.map((name, i) => aliases.includes(name) ? i : -1).filter(i => i !== -1);
      if (matches.length === 0) throw new Error("Missing " + label + " column. Use date,month,price.");
      if (matches.length > 1) throw new Error("Multiple columns match " + label + ".");
      return matches[0];
    }
    const dateCol = column(dateHeader, "date");
    const monthCol = column(monthHeader, "month");
    const priceCol = column(priceHeader, "price");
    if (records.length === 1) throw new Error("The CSV contains no price observations.");
    const seen = new Set();
    return records.slice(1).map(({ values, line }) => {
      const label = "CSV line " + line;
      if (values.length !== headers.length) throw new Error(label + " has an unexpected number of fields.");
      const value = values[priceCol].trim();
      const row = { date: values[dateCol].trim(), month: values[monthCol].trim(), price: numericPattern.test(value) ? Number(value) : NaN };
      validateRow(row, label, seen);
      return row;
    });
  }

  function indexRows(rows) {
    const curves = new Map(), spreads = new Map(), seen = new Set();
    for (const [i, row] of rows.entries()) {
      validateRow(row, "Observation " + (i + 1), seen);
      if (!curves.has(row.date)) curves.set(row.date, []);
      curves.get(row.date).push(row);
    }
    const dates = [...curves.keys()].sort();
    for (const date of dates) {
      const curve = curves.get(date);
      curve.sort((a, b) => a.month.localeCompare(b.month));
      for (let i = 0; i + 1 < curve.length; i += 1) {
        const march = curve[i], april = curve[i + 1];
        if (!march.month.endsWith("-03")) continue;
        const yearLabel = march.month.slice(0, 4);
        if (april.month !== yearLabel + "-04") continue;
        const year = Number(yearLabel);
        if (!spreads.has(year)) spreads.set(year, []);
        const daysToMarch = (Date.parse(yearLabel + "-03-01T00:00:00Z") - Date.parse(date + "T00:00:00Z")) / 86400000;
        spreads.get(year).push({ date, march: march.price, april: april.price, spread: march.price - april.price, daysToMarch });
      }
    }
    return { dates, curves, spreads };
  }

  function monthNumber(label) {
    return Number(label.slice(0, 4)) * 12 + Number(label.slice(5, 7)) - 1;
  }

  function compare(index, dateA, dateB, mode = "delivery") {
    if (mode !== "delivery" && mode !== "tenor") throw new Error("Choose delivery or tenor alignment.");
    const quotesA = index.curves.get(dateA) || [];
    const quotesB = index.curves.get(dateB) || [];
    function keyed(quotes) {
      const result = new Map();
      if (quotes.length === 0) return result;
      const frontMonth = monthNumber(quotes[0].month);
      for (const row of quotes) {
        const key = mode === "delivery" ? row.month : monthNumber(row.month) - frontMonth + 1;
        result.set(key, row);
      }
      return result;
    }
    const a = keyed(quotesA), b = keyed(quotesB);
    const keys = [...new Set([...a.keys(), ...b.keys()])];
    if (mode === "tenor") keys.sort((x, y) => x - y);
    else keys.sort();
    return keys.map(key => {
      const rowA = a.get(key), rowB = b.get(key);
      return {
        key, monthA: rowA?.month ?? null, monthB: rowB?.month ?? null,
        priceA: rowA?.price ?? null, priceB: rowB?.price ?? null,
        change: rowA && rowB ? rowB.price - rowA.price : null
      };
    });
  }

  function spreadYears(index) {
    return [...index.spreads.keys()].sort((a, b) => a - b);
  }

  function spread(index, year) {
    return index.spreads.get(Number(year)) || [];
  }

  function winterPremium(index, date, startYear) {
    const winterYear = Number(startYear), nextYear = winterYear + 1;
    if (!Number.isInteger(winterYear) || winterYear < 1 || nextYear > 9999) throw new Error("Invalid winter start year.");
    const winter = [], summer = [];
    for (const row of index.curves.get(date) || []) {
      const year = Number(row.month.slice(0, 4)), month = Number(row.month.slice(5));
      if ((year === winterYear && month >= 11) || (year === nextYear && month <= 3)) winter.push(row.price);
      if (year === nextYear && month >= 4 && month <= 10) summer.push(row.price);
    }
    const mean = (prices, required) => prices.length === required ? prices.reduce((sum, value) => sum + value, 0) / required : null;
    const winterMean = mean(winter, 5), summerMean = mean(summer, 7);
    return {
      winterMean, summerMean, winterCount: winter.length, summerCount: summer.length,
      premium: winterMean !== null && summerMean !== null ? winterMean - summerMean : null
    };
  }

  function seasonMonths(startYear) {
    const year = Number(startYear);
    if (!Number.isInteger(year) || year < 1 || year > 9998) throw new Error("Invalid winter start year.");
    return Array.from({length:12}, (_, i) => {
      const month = (10 + i) % 12 + 1;
      return String(year + (i >= 2 ? 1 : 0)).padStart(4,"0") + "-" + String(month).padStart(2,"0");
    });
  }

  function csv(headers, rows) {
    function escape(value) {
      const text = value == null ? "" : String(value);
      return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
    }
    const lines = [headers, ...rows].map(row => row.map(escape).join(","));
    return lines.join("\r\n") + "\r\n";
  }

  const api = { parseCSV, indexRows, compare, spread, spreadYears, winterPremium, seasonMonths, csv };
  scope.CurveEngine = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);

