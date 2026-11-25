/*
  Offline shim — injected by build.js into the standalone offline build only.

  The online app calls same-origin /api/* endpoints that live on Vercel. In the
  single-file offline build there is no server, so this script intercepts those
  calls and answers them from data bundled into the file (__RTA_BUNDLE__).
  Everything else (postcodes.io, police.uk, MI5, GitHub, map tiles) is left
  alone: it works if the machine happens to be online and fails fast, into the
  app's existing fallbacks, if it isn't.
*/
(function () {
  "use strict";
  window.__RTA_OFFLINE__ = true;
  var BUNDLE = window.__RTA_BUNDLE__ || {};
  var realFetch = window.fetch ? window.fetch.bind(window) : null;

  function json(body, status) {
    return new Response(JSON.stringify(body), {
      status: status || 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || "";
    var path = url.replace(/^[a-z]+:\/\/[^/]+/i, "").split("?")[0];
    switch (path) {
      case "/api/db":
        return Promise.resolve(json(BUNDLE.db));
      case "/api/martyns-law":
        // Bundled baseline only; no live legislation.gov.uk / GOV.UK check.
        return Promise.resolve(json({
          baseline: BUNDLE.martynsLaw,
          live: { reachable: false },
          drift: [],
          checked: null
        }));
      case "/api/threat-level":
        // 503 sends the app to its own fallback (cached level, "verify at MI5").
        return Promise.resolve(json({ error: "offline build" }, 503));
      case "/api/report":
        return Promise.resolve(json({ error: "Server report is not available in the offline build" }, 501));
    }
    if (/^\/api\//.test(path)) return Promise.resolve(json({ error: "offline build" }, 404));
    if (!realFetch) return Promise.reject(new TypeError("offline"));
    return realFetch(input, init);
  };

  /*
    Word export. The app builds its full Word report as Word-flavoured HTML
    (headings, paragraphs, tables, inline colours). This converts that HTML to
    native WordprocessingML and zips it into a real .docx, so it opens in Word,
    LibreOffice, Google Docs and Pages alike. Requires JSZip (inlined by build.js).
    It handles the element set the report uses; it is not a general HTML engine.
  */
  var NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
           'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  var TXT_W = 9638; // A4 width minus 2 x 2cm margins, in twips
  var BLOCK = /^(DIV|P|H[1-6]|TABLE|UL|OL|SECTION)$/;

  function esc(t) {
    return String(t).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function parseDecls(str) {
    var o = {};
    String(str || "").split(";").forEach(function (d) {
      var i = d.indexOf(":");
      if (i > 0) o[d.slice(0, i).trim().toLowerCase()] = d.slice(i + 1).trim();
    });
    return o;
  }
  var NAMED = { white: "FFFFFF", black: "000000", navy: "1B2A4A" };
  function hex(c) {
    if (!c) return null;
    c = c.trim().toLowerCase();
    if (NAMED[c]) return NAMED[c];
    var m = c.match(/^#([0-9a-f]{3})$/); if (m) return m[1].split("").map(function (x) { return x + x; }).join("").toUpperCase();
    m = c.match(/^#([0-9a-f]{6})$/); if (m) return m[1].toUpperCase();
    m = c.match(/rgba?\((\d+)[ ,]+(\d+)[ ,]+(\d+)/);
    if (m) return [m[1], m[2], m[3]].map(function (n) { return ("0" + (+n).toString(16)).slice(-2); }).join("").toUpperCase();
    return null;
  }
  function halfPts(v) {
    var m = String(v || "").match(/([\d.]+)\s*(pt|px)?/); if (!m) return null;
    var n = parseFloat(m[1]); return Math.round((m[2] === "px" ? n * 0.75 : n) * 2);
  }

  function convert(html) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    // Simple selectors from the report's <style> block: tag or .class
    var rules = {};
    var css = (doc.querySelector("style") || {}).textContent || "";
    css = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/@page[^{]*\{[^}]*\}/g, "");
    css.replace(/([^{}]+)\{([^}]*)\}/g, function (m, sel, body) {
      sel.split(",").forEach(function (s) {
        s = s.trim(); if (/^[.]?[A-Za-z0-9_-]+$/.test(s)) rules[s.toLowerCase()] = Object.assign(rules[s.toLowerCase()] || {}, parseDecls(body));
      });
      return "";
    });
    function styleOf(el) {
      var o = {}, tag = el.tagName.toLowerCase();
      Object.assign(o, rules[tag] || {});
      (el.getAttribute("class") || "").split(/\s+/).forEach(function (c) { if (c) Object.assign(o, rules["." + c.toLowerCase()] || {}); });
      Object.assign(o, parseDecls(el.getAttribute("style")));
      return o;
    }
    var headerXml = "", footerXml = "";
    function mine(st, base) { // merge text-level props over inherited
      var o = Object.assign({}, base);
      if (st.color) o.color = hex(st.color) || o.color;
      if (st["font-size"]) o.size = halfPts(st["font-size"]) || o.size;
      if (st["font-weight"]) o.bold = /bold|[6-9]00/.test(st["font-weight"]);
      if (st["font-style"]) o.italic = /italic/.test(st["font-style"]);
      if (st["text-transform"]) o.caps = /uppercase/.test(st["text-transform"]);
      if (st["text-align"]) o.align = st["text-align"];
      return o;
    }
    function runXml(text, f) {
      var rpr = "<w:rFonts w:ascii=\"Arial\" w:hAnsi=\"Arial\" w:cs=\"Arial\"/>" +
        (f.bold ? "<w:b/>" : "") + (f.italic ? "<w:i/>" : "") + (f.caps ? "<w:caps/>" : "") +
        "<w:color w:val=\"" + (f.color || "333333") + "\"/>" +
        "<w:sz w:val=\"" + (f.size || 18) + "\"/><w:szCs w:val=\"" + (f.size || 18) + "\"/>";
      return "<w:r><w:rPr>" + rpr + "</w:rPr><w:t xml:space=\"preserve\">" + esc(text) + "</w:t></w:r>";
    }
    function inline(node, f) { // -> run/field xml for an inline node
      if (node.nodeType === 3) {
        var t = node.nodeValue.replace(/\s+/g, " ");
        return t.trim() === "" && !t ? "" : (t === "" ? "" : runXml(t, f));
      }
      if (node.nodeType !== 1) return "";
      var tag = node.tagName;
      if (tag === "BR") return "<w:r><w:br/></w:r>";
      var st = styleOf(node);
      var code = (st["mso-field-code"] || "").toUpperCase();
      if (code === "PAGE" || code === "NUMPAGES")
        return "<w:fldSimple w:instr=\" " + code + " \">" + runXml("1", f) + "</w:fldSimple>";
      var g = mine(st, f);
      if (tag === "B" || tag === "STRONG" || /^H[1-6]$/.test(tag)) g.bold = true;
      if (tag === "I" || tag === "EM") g.italic = true;
      var out = "";
      for (var c = node.firstChild; c; c = c.nextSibling) out += inline(c, g);
      return out;
    }
    function para(inner, f, st, extra) {
      st = st || {};
      var al = f.align === "center" ? "center" : f.align === "right" ? "right" : "left";
      var ppr = (st["page-break-before"] === "always" ? "<w:pageBreakBefore/>" : "") +
        "<w:keepNext w:val=\"" + (extra && extra.keep ? 1 : 0) + "\"/>";
      var bb = st["border-bottom"] && st["border-bottom"].match(/([\d.]+)pt\s+solid\s+(#?\w+)/);
      if (bb) ppr += "<w:pBdr><w:bottom w:val=\"single\" w:sz=\"" + Math.max(2, Math.round(parseFloat(bb[1]) * 8)) +
        "\" w:space=\"1\" w:color=\"" + (hex(bb[2]) || "1B2A4A") + "\"/></w:pBdr>";
      if (st._shade) ppr += "<w:shd w:val=\"clear\" w:color=\"auto\" w:fill=\"" + st._shade + "\"/>";
      ppr += "<w:spacing w:before=\"" + ((extra && extra.before) || 0) + "\" w:after=\"" + ((extra && extra.after) != null ? extra.after : 80) + "\"/>";
      ppr += "<w:jc w:val=\"" + al + "\"/>";
      return "<w:p><w:pPr>" + ppr + "</w:pPr>" + inner + "</w:p>";
    }
    function cellBlocks(el, f) { // td/th content -> paragraphs (at least one)
      var x = blocks(el, f, true);
      return x || para("", f, {}, { after: 0 });
    }
    function table(el, f) {
      var rows = [].slice.call(el.querySelectorAll("tr")).filter(function (r) { return r.closest("table") === el; });
      var cols = 1;
      rows.forEach(function (r) {
        var n = 0; [].forEach.call(r.children, function (c) { n += parseInt(c.getAttribute("colspan") || 1, 10); });
        if (n > cols) cols = n;
      });
      var grid = ""; for (var i = 0; i < cols; i++) grid += "<w:gridCol w:w=\"" + Math.floor(TXT_W / cols) + "\"/>";
      var bd = "<w:tblBorders>" + ["top", "left", "bottom", "right", "insideH", "insideV"].map(function (b) {
        return "<w:" + b + " w:val=\"single\" w:sz=\"4\" w:space=\"0\" w:color=\"D6DCE4\"/>"; }).join("") + "</w:tblBorders>";
      var xml = "<w:tbl><w:tblPr><w:tblW w:w=\"" + TXT_W + "\" w:type=\"dxa\"/>" + bd +
        "<w:tblLayout w:type=\"fixed\"/><w:tblCellMar><w:top w:w=\"60\" w:type=\"dxa\"/><w:left w:w=\"100\" w:type=\"dxa\"/>" +
        "<w:bottom w:w=\"60\" w:type=\"dxa\"/><w:right w:w=\"100\" w:type=\"dxa\"/></w:tblCellMar></w:tblPr><w:tblGrid>" + grid + "</w:tblGrid>";
      rows.forEach(function (r) {
        var isHead = r.querySelector("th") && !r.querySelector("td");
        xml += "<w:tr><w:trPr><w:cantSplit/>" + (isHead ? "<w:tblHeader/>" : "") + "</w:trPr>";
        [].forEach.call(r.children, function (c) {
          if (!/^T[DH]$/.test(c.tagName)) return;
          var st = styleOf(c), span = parseInt(c.getAttribute("colspan") || 1, 10);
          var w = Math.floor(TXT_W / cols) * span, pm = (st.width || "").match(/([\d.]+)%/);
          if (pm && span === 1) w = Math.round(TXT_W * parseFloat(pm[1]) / 100);
          var th = c.tagName === "TH";
          var cf = mine(st, { size: th ? 16 : 18, bold: th, color: th ? "FFFFFF" : null, align: "center" });
          if (th) { cf.caps = true; if (!st.color) cf.color = "FFFFFF"; }
          var fill = hex(st["background"] || st["background-color"]) || (th ? "1B2A4A" : null);
          xml += "<w:tc><w:tcPr><w:tcW w:w=\"" + w + "\" w:type=\"dxa\"/>" + (span > 1 ? "<w:gridSpan w:val=\"" + span + "\"/>" : "") +
            (fill ? "<w:shd w:val=\"clear\" w:color=\"auto\" w:fill=\"" + fill + "\"/>" : "") +
            "<w:vAlign w:val=\"" + (/middle/.test(st["vertical-align"] || "") || th ? "center" : "top") + "\"/></w:tcPr>" +
            cellBlocks(c, cf) + "</w:tc>";
        });
        xml += "</w:tr>";
      });
      return xml + "</w:tbl>" + para("", f, {}, { after: 120 });
    }
    // Convert children of `el` into block XML, grouping inline runs into paragraphs.
    function blocks(el, f, inCell) {
      var out = "", buf = "";
      function flush(st) {
        if (buf.replace(/<[^>]*>/g, "").trim() !== "" || /<w:br\/>|<w:fld/.test(buf)) out += para(buf, f, st, { after: inCell ? 0 : 80 });
        buf = "";
      }
      for (var n = el.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 1 && BLOCK.test(n.tagName)) {
          var st = styleOf(n), tag = n.tagName;
          if (/mso-element/.test(n.getAttribute("style") || "")) continue; // header/footer holders
          flush({});
          if (tag === "TABLE") { out += table(n, f); continue; }
          if (/^H[1-6]$/.test(tag)) {
            var hf = mine(st, f); hf.bold = true;
            if (!st.color && !f.color) hf.color = "1B2A4A";
            var pad = tag === "H1" ? 0 : 120;
            out += para(inline({ nodeType: 1, tagName: "SPAN", firstChild: n.firstChild, getAttribute: function () { return null; } }, hf), hf, st,
              { keep: true, before: pad, after: 100 });
            continue;
          }
          if (tag === "UL" || tag === "OL") {
            var k = 0;
            [].forEach.call(n.children, function (li) {
              k++; var lf = mine(styleOf(li), f);
              out += para(runXml(tag === "UL" ? "•  " : k + ".  ", lf) + inline({ nodeType: 1, tagName: "SPAN", firstChild: li.firstChild, getAttribute: function () { return null; } }, lf), lf, {}, { after: 40 });
            });
            continue;
          }
          var nf = mine(st, f);
          if (tag === "P") {
            out += para(inline({ nodeType: 1, tagName: "SPAN", firstChild: n.firstChild, getAttribute: function () { return null; } }, nf), nf, st, { after: 100 });
          } else { // DIV / SECTION: contents may be blocks or inline
            var sub = blocks(n, nf, inCell);
            if (n.classList && n.classList.contains("footer")) sub = sub.replace("<w:spacing w:before=\"0\"", "<w:spacing w:before=\"240\"");
            out += sub;
          }
        } else {
          buf += inline(n, f);
        }
      }
      flush({});
      return out;
    }

    // Header / footer text from the Word-only holders
    function hf(id) {
      var el = doc.getElementById(id); if (!el) return "";
      var p = el.querySelector("p") || el;
      return "<w:p><w:pPr><w:jc w:val=\"" + (id === "f1" ? "center" : "left") + "\"/></w:pPr>" +
        inline(p, { size: 16, color: "94A3B8" }) + "</w:p>";
    }
    var base = { size: 18, color: "333333", align: "left" };
    var body = blocks(doc.body, base, false);
    return {
      body: body, header: hf("h1") || "<w:p/>", footer: hf("f1") || "<w:p/>"
    };
  }

  window.__rtaSaveWord = function (html, baseName) {
    if (!window.JSZip) return false;
    var c;
    try { c = convert(html); } catch (e) { console.error("Word conversion failed", e); return false; }
    var X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    var RT = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    var zip = new window.JSZip();
    zip.file("[Content_Types].xml", X +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' +
      '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' +
      "</Types>");
    zip.file("_rels/.rels", X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="' + RT + '/officeDocument" Target="word/document.xml"/></Relationships>');
    zip.file("word/_rels/document.xml.rels", X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="' + RT + '/styles" Target="styles.xml"/>' +
      '<Relationship Id="rId2" Type="' + RT + '/header" Target="header1.xml"/>' +
      '<Relationship Id="rId3" Type="' + RT + '/footer" Target="footer1.xml"/></Relationships>');
    zip.file("word/styles.xml", X + "<w:styles " + NS + "><w:docDefaults><w:rPrDefault><w:rPr>" +
      '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="18"/><w:szCs w:val="18"/><w:lang w:val="en-GB"/>' +
      '</w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>');
    zip.file("word/header1.xml", X + "<w:hdr " + NS + ">" + c.header + "</w:hdr>");
    zip.file("word/footer1.xml", X + "<w:ftr " + NS + ">" + c.footer + "</w:ftr>");
    zip.file("word/document.xml", X + "<w:document " + NS + "><w:body>" + c.body +
      '<w:sectPr><w:headerReference w:type="default" r:id="rId2"/><w:footerReference w:type="default" r:id="rId3"/>' +
      '<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="454" w:gutter="0"/></w:sectPr>' +
      "</w:body></w:document>");
    zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      compression: "DEFLATE"
    }).then(function (blob) {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = baseName + ".docx";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 300);
    });
    return true;
  };
})();
