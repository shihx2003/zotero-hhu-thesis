{
  "translatorID": "3bd9dbbb-7b2e-45f6-bb15-370bd5a90e38",
  "label": "Hohai University Chaoxing Thesis",
  "creator": "Codex",
  "target": "^https?://thesis\\.chaoxing\\.com/front/thesis/detail\\.html\\?",
  "minVersion": "5.0",
  "maxVersion": "",
  "priority": 100,
  "inRepository": false,
  "translatorType": 4,
  "browserSupport": "gcsibv",
  "lastUpdated": "2026-10-10 14:00:00"
}

// Metadata extraction verified on thesis 254806 on 2026-10-10.
// PDF saving is enabled; actual download depends on site access and Zotero settings.
// Never execute site scripts or hardcode cookies, enc values, or download signatures.
var ENABLE_PDF = true;

function clean(value) {
  return Zotero.Utilities.trimInternal(String(value || "").replace(/\u00a0/g, " "));
}

function nodeText(node) {
  if (!node) return "";
  var paragraphs = Array.from(node.querySelectorAll("p"));
  return paragraphs.length
    ? paragraphs.map(function (p) { return clean(p.textContent); }).filter(Boolean).join("\n\n")
    : clean(node.textContent);
}

function readFields(doc) {
  var fields = Object.create(null);
  for (var row of doc.querySelectorAll("li")) {
    var children = Array.from(row.children);
    var label = children.find(function (n) {
      return n.matches(".name, .name1");
    });
    var value = children.find(function (n) {
      return n.matches(".richtext, .tit");
    });
    if (!label || !value) continue;
    var key = clean(label.textContent).replace(/[：:]$/, "");
    if (key === "全文附件") {
      value = value.cloneNode(true);
      for (var control of value.querySelectorAll("a, button")) control.remove();
    }
    var text = nodeText(value);
    if (key && text) fields[key] = text;
  }
  return fields;
}

function findContent(doc, depth) {
  var fields = readFields(doc);
  if (fields["中文题名"]) return { doc: doc, fields: fields };
  // Current page has no iframe. Support readable embedded variants without
  // requesting unrelated frames or attempting to bypass same-origin access.
  if (depth < 2) {
    for (var frame of doc.querySelectorAll("iframe")) {
      try {
        if (!frame.contentDocument) continue;
        var result = findContent(frame.contentDocument, depth + 1);
        if (result) return result;
      }
      catch (e) { /* Cross-origin frame: inaccessible in this document. */ }
    }
  }
  return null;
}

function detectWeb(doc, url) {
  if (!/^https?:\/\/thesis\.chaoxing\.com\/front\/thesis\/detail\.html\?/i.test(url)
    || !/[?&]websiteId=143555(?:&|#|$)/.test(url)
    || !/[?&]id=\d+(?:&|#|$)/.test(url)) return false;
  // Identify the page by its stable URL, independently of loading timing.
  // Validate actual metadata only when the user starts saving in doWeb.
  return "thesis";
}

function pdfURL(doc, url) {
  // Parse only the observed literal concatenation; do not eval site code.
  var pattern = /["']\/back\/thesis\/downLoadFile\?thesisId=["']\s*\+\s*(\d+)\s*\+\s*["']&fid=["']\s*\+\s*(\d+)\s*\+\s*["']&sign=["']\s*\+\s*["']([\w-]+)["']\s*\+\s*["']&type=1["']/;
  var thesisID = (url.match(/[?&]id=(\d+)(?:&|$)/) || [])[1];
  for (var script of doc.querySelectorAll("script:not([src])")) {
    var source = script.textContent || "";
    var start = source.indexOf("function buttonDownloadFile(");
    if (start === -1) continue;
    var match = source.slice(start).match(pattern);
    if (!match || match[1] !== thesisID || match[2] !== "24578") continue;
    return "https://thesis.chaoxing.com/back/thesis/downLoadFile?thesisId="
      + match[1] + "&fid=" + match[2] + "&sign="
      + encodeURIComponent(match[3]) + "&type=1";
  }
  return "";
}

function doWeb(doc, url) {
  if (!detectWeb(doc, url)) {
    throw new Error("请等待论文详情加载完成，并确认已通过校园网认证，然后重新抓取。");
  }
  var content = findContent(doc, 0);
  if (!content) {
    throw new Error("尚未读取到中文题名。请完成认证并等待详情正文加载后重新抓取。");
  }
  var f = content.fields;
  var item = new Zotero.Item("thesis");
  item.title = f["中文题名"];
  item.university = "河海大学";
  item.thesisType = f["学位"] || f["学位类型"] || "学位论文";
  // Do not present admission year as the year the thesis was awarded.
  item.date = f["答辩时间"] || "";
  item.language = f["论文语种"] || "中文";
  item.numPages = f["论文页数"] || "";
  item.callNumber = f["索书号"] || "";
  item.url = url;
  item.libraryCatalog = "河海大学学位论文管理系统（超星）";
  item.abstractNote = [f["中文摘要"], f["外文摘要"] ? "外文摘要：\n" + f["外文摘要"] : ""]
    .filter(Boolean).join("\n\n");
  if (f["姓名"]) {
    item.creators.push({ lastName: f["姓名"], creatorType: "author", fieldMode: 1 });
  }
  var advisors = Object.create(null);
  for (var key of Object.keys(f)) {
    if (/^导师\d*姓名$/.test(key)) {
      for (var name of f[key].split(/[;；、\n]+/).map(clean).filter(Boolean)) {
        if (advisors[name]) continue;
        advisors[name] = true;
        item.creators.push({ lastName: name, creatorType: "contributor", fieldMode: 1 });
      }
    }
  }
  item.tags = Array.from(new Set((f["中文关键词"] || "").split(/[;；\n]+/)
    .map(clean).filter(Boolean))).map(function (tag) { return { tag: tag }; });
  // "institution" is not a separate valid thesis field; keep the college in Extra.
  var extraKeys = ["外文题名", "外文关键词", "学号/工号", "学院", "专业", "入学年份",
    "学科门类", "一级学科", "二级学科", "学位类型", "研究方向", "参考文献数量",
    "中图分类号", "库房名称", "全文附件"];
  extraKeys = extraKeys.concat(Object.keys(f).filter(function (key) {
    return /^导师\d*(姓名|单位)$/.test(key);
  }));
  item.extra = extraKeys.filter(function (key) { return Boolean(f[key]); })
    .map(function (key) { return key + ": " + f[key]; }).join("\n");
  // Translator sandbox saves attachments through item.attachments. Desktop-only
  // Zotero.Attachments.importFromURL/importFromDocument are not translator APIs.
  // A link avoids storing hidden personal fields from the inline page scripts.
  item.attachments.push({ title: "论文详情", url: url, mimeType: "text/html", snapshot: false });
  if (ENABLE_PDF && /\.pdf(?:\s|$)/i.test(f["全文附件"] || "")) {
    try {
      var pdf = pdfURL(content.doc, url);
      if (pdf) {
        item.attachments.push({ title: "Full Text PDF", url: pdf, mimeType: "application/pdf", proxy: false });
      }
      else {
        Zotero.debug("Hohai Thesis: no supported PDF download URL found in this page.");
      }
    }
    catch (e) {
      // Failure to resolve an optional PDF must not prevent metadata saving.
      Zotero.debug("Hohai Thesis: PDF URL extraction failed; saving metadata only.");
    }
  }
  item.complete();
}
