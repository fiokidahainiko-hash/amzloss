/**
 * AmzLoss Backlink Directory — form backend (Google Apps Script)
 *
 * SETUP:
 * 1. Go to https://script.google.com and create a new project.
 * 2. Paste this entire file into Code.gs.
 * 3. Create a Google Sheet, copy its ID from the URL
 *    (the part between /d/ and /edit — e.g. 1AbC...xyz).
 * 4. Set SHEET_ID below to that ID, and OWNER_EMAIL to your address.
 * 5. Run setup_ once to authorize and create the sheet tabs.
 * 6. Deploy: Deploy -> New deployment -> Web app ->
 *      Execute as: Me, Who has access: Anyone
 * 7. Copy the /exec URL and put it in js/directory.js as
 *      AMZLOSS_FORM_ENDPOINT
 *
 * The frontend posts JSON (no-cors, text/plain) to this URL.
 * We read the raw POST body because Apps Script echoes CORS.
 */

var SHEET_ID = "1GIj_vgCBC29T_-cGqMxKyHEsYHe-91kkze5s2mQNGWQ";
var OWNER_EMAIL = "admin@amzloss.com";

function doGet(e) {
  var param = (e && e.parameter) || {};
  if (param.action === "list") {
    return listVerifiedSites_();
  }
  if (param.action === "ping") {
    return handlePing_(param);
  }
  return ContentService.createTextOutput(
    JSON.stringify({ ok: true, service: "amzloss-directory-form" })
  ).setMimeType(ContentService.MimeType.JSON);
}

/** Returns verified sites from the Verified tab as a JSON array for the directory page. */
function listVerifiedSites_() {
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID);
    var tab = sheet.getSheetByName("Verified");
    if (!tab || tab.getLastRow() < 2) {
      return ContentService.createTextOutput(
        JSON.stringify({ ok: true, sites: [] })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    var rows = tab.getDataRange().getValues();
    var sites = [];
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      var obj = {
        name: r[2] || "",
        url: r[3] || "",
        category: r[4] || "",
        description: r[5] || ""
      };
      if (obj.url) sites.push(obj);
    }
    return ContentService.createTextOutput(
      JSON.stringify({ ok: true, sites: sites })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err), sites: [] })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var body = "";
    if (e && e.postData && e.postData.contents) {
      body = e.postData.contents;
    }
    var data = {};
    try { data = JSON.parse(body || "{}"); } catch (err) {
      try { data = JSON.parse(decodeURIComponent(body)); } catch (err2) { data = { raw: body }; }
    }

    var sheet = SpreadsheetApp.openById(SHEET_ID);
    var tab = sheet.getSheetByName(data.stage === "verified" ? "Verified" : "Submissions");
    if (!tab) {
      tab = sheet.getSheetByName("Submissions");
    }
    if (!tab) {
      tab = ensureTabs_(sheet);
    }

    var row = [
      new Date().toISOString(),
      data.stage || "submitted",
      data.site_name || data.name || "",
      data.site_url || data.url || "",
      data.category || data.cat || "",
      data.description || data.desc || "",
      data.email || "",
      data.token || ""
    ];
    tab.appendRow(row);

    if (data.stage === "verified") {
      MailApp.sendEmail({
        to: OWNER_EMAIL,
        subject: "Directory verified: " + (data.site_name || data.name || ""),
        body: "A site verified its backlink:\n\n" +
              "Site: " + (data.site_name || data.name || "") + "\n" +
              "URL: " + (data.site_url || data.url || "") + "\n" +
              "Category: " + (data.category || data.cat || "") + "\n" +
              "Description: " + (data.description || data.desc || "") + "\n" +
              "Email: " + (data.email || "") + "\n" +
              "Token: " + (data.token || "") + "\n"
      });
    }

    return ContentService.createTextOutput(
      JSON.stringify({ ok: true, received: data.stage || "submitted" })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/** Ensures the Submissions and Verified tabs exist; creates them on first run. */
function ensureTabs_(sheet) {
  ["Submissions", "Verified"].forEach(function (name) {
    if (!sheet.getSheetByName(name)) {
      var tab = sheet.insertSheet(name);
      tab.appendRow(["timestamp", "stage", "site_name", "site_url", "category", "description", "email", "token"]);
    }
  });
  return sheet.getSheetByName("Submissions");
}

/** Run once from the editor to authorize and create the sheet tabs. */
function setup_() {
  var sheet = SpreadsheetApp.openById(SHEET_ID);
  ensureTabs_(sheet);
  Logger.log("Setup complete. Sheet ID: " + SHEET_ID);
}

/* ---------------------------------------------------------------------------
 * URL Submitter auto-ping proxy.
 *
 * The browser cannot fire cross-site pings (CORS), so the submit page calls
 * this backend with ?action=ping and we fire the real server-side requests
 * here. The same deployment URL powers both the directory and the submitter,
 * so no second web app is needed.
 * ------------------------------------------------------------------------- */

/** XML-RPC body for weblogUpdates.ping (used by the classic ping services). */
function xmlRpcPingBody_(blogName, blogUrl) {
  return '<?xml version="1.0"?>' +
    "<methodCall>" +
    "<methodName>weblogUpdates.ping</methodName>" +
    "<params>" +
    "<param><value><string>" + blogName + "</string></value></param>" +
    "<param><value><string>" + blogUrl + "</string></value></param>" +
    "</params>" +
    "</methodCall>";
}

/** Fires the free, no-login pings that still work: Ping-O-Matic and IndexNow. */
function handlePing_(p) {
  var results = { ok: false, targets: {} };
  try {
    var url = String(p.url || "").trim();
    if (!/^https?:\/\//i.test(url)) throw new Error("Invalid URL");

    var name = "AmzLoss URL Submission";

    /* Classic XML-RPC ping services. Google's old sitemap ping was retired in
     * 2023/2024 (it now returns 404), so there is no automatic Google ping —
     * Google is covered by the manual Search Console checklist instead.
     * Of the remaining free pingers, only Ping-O-Matic still accepts anonymous
     * XML-RPC pings (Pingler now requires an API key; PingMyURL returns HTML).
     * SuperPing and MyPing endpoints no longer respond, so they are dropped
     * from the automatic targets to keep results honest. */
    var xml = xmlRpcPingBody_(name, url);
    var pingers = {
      pingomatic: "https://rpc.pingomatic.com/"
    };
    Object.keys(pingers).forEach(function (k) {
      try {
        var r = UrlFetchApp.fetch(pingers[k], {
          method: "post",
          payload: xml,
          contentType: "text/xml",
          muteHttpExceptions: true,
          followRedirects: false
        });
        results.targets[k] = { code: r.getResponseCode(), ok: r.getResponseCode() < 400 };
      } catch (err) {
        results.targets[k] = { code: 0, ok: false, error: String(err) };
      }
    });

    /* 3. IndexNow — Bing, Yandex, Seznam, Naver, Baidu. Needs the key file. */
    if (p.indexnowKey) {
      var host = "";
      try { host = new URL(url).hostname; } catch (e) { host = url.replace(/^https?:\/\//i, "").split("/")[0]; }
      var key = String(p.indexnowKey || "").trim();
      var keyLocation = String(p.indexnowKeyLocation || "").trim();
      if (!keyLocation && host) keyLocation = "https://" + host + "/" + key + ".txt";
      try {
        var inRes = UrlFetchApp.fetch("https://api.indexnow.org/indexnow", {
          method: "post",
          payload: JSON.stringify({
            host: host,
            key: key,
            keyLocation: keyLocation,
            urlList: [url]
          }),
          contentType: "application/json; charset=utf-8",
          muteHttpExceptions: true,
          followRedirects: false
        });
        var inCode = inRes.getResponseCode();
        results.targets.indexnow = { code: inCode, ok: inCode === 200 || inCode === 202 };
        if (!results.targets.indexnow.ok) {
          results.targets.indexnow.error = String(inRes.getContentText()).slice(0, 200);
        }
      } catch (err) {
        results.targets.indexnow = { code: 0, ok: false, error: String(err) };
      }
    } else {
      results.targets.indexnow = { code: 0, ok: false, skipped: true, error: "No IndexNow key provided" };
    }

    results.ok = true;
    results.url = url;
  } catch (err) {
    results.error = String(err);
  }
  return ContentService.createTextOutput(JSON.stringify(results)).setMimeType(ContentService.MimeType.JSON);
}