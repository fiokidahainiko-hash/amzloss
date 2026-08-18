/* AmzLoss — backlink checker with multi-proxy fallback.
   Tries several public CORS proxies in order so a single flaky proxy
   doesn't make checks fail. Runs entirely in the browser.
   Auto-binds: #check_url, #check_target, #check_link, #check_status, #check_detail. */
(function () {
  "use strict";

  var PROXIES = [
    "https://api.allorigins.win/raw?url=",
    "https://corsproxy.io/?url=",
    "https://api.codetabs.com/v1/proxy?quest=",
    "https://thingproxy.freeboard.io/fetch/"
  ];

  function checkPage(pageUrl, keyword, cb) {
    var i = 0;
    function tryNext() {
      if (i >= PROXIES.length) {
        cb({ ok: false, found: false, error: "blocked" });
        return;
      }
      var proxy = PROXIES[i++];
      fetch(proxy + encodeURIComponent(pageUrl))
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.text();
        })
        .then(function (html) {
          cb({ ok: true, found: html.toLowerCase().indexOf(keyword.toLowerCase()) !== -1 });
        })
        .catch(function () { tryNext(); });
    }
    tryNext();
  }

  window.AZLBacklinkCheck = checkPage;

  /* ---------- Backlink counter (Open PageRank, at large) ----------
     Reports total backlinks + referring domains from the Common Crawl
     web graph via the Open PageRank index. CORS-enabled API, optional
     free key stored in localStorage. */

  var OPR_API = "https://openpagerank.keywordseverywhere.com/v1/domains/bulk";

  function formatCount(n) {
    if (n == null) return "—";
    return n.toLocaleString("en-US");
  }

  function countBacklinks(domain, apiKey, cb) {
    var headers = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = "Bearer " + apiKey;
    fetch(OPR_API, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ domains: [domain] })
    })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        var res = data && data.response && data.response[0];
        if (!res) throw new Error("empty");
        cb({
          ok: true,
          domain: res.domain || domain,
          opr: typeof res.opr === "number" ? res.opr : null,
          rank: typeof res.rank === "number" ? res.rank : null,
          referringDomains: res.referring_domains != null ? res.referring_domains : null,
          backlinks: res.backlinks != null ? res.backlinks : null
        });
      })
      .catch(function (e) { cb({ ok: false, error: (e && e.message) || "failed" }); });
  }

  window.AZLBacklinkCount = countBacklinks;

  document.addEventListener("DOMContentLoaded", function () {
    var countBtn = document.getElementById("bl_check");
    if (countBtn) {
      var domEl = document.getElementById("bl_domain");
      var statusEl = document.getElementById("bl_status");
      var detailEl = document.getElementById("bl_detail");
      var metricsEl = document.getElementById("bl_metrics");
      var rdEl = document.getElementById("bl_rd");
      var rankEl = document.getElementById("bl_rank");
      var scoreEl = document.getElementById("bl_score");
      var keyInputEl = document.getElementById("bl_key");

      if (keyInputEl) {
        keyInputEl.value = localStorage.getItem("opr_key") || "";
      }
      var saveBtn = document.getElementById("bl_key_save");
      if (saveBtn) {
        saveBtn.addEventListener("click", function () {
          localStorage.setItem("opr_key", (keyInputEl.value || "").trim());
          saveBtn.textContent = "Saved ✓";
          setTimeout(function () { saveBtn.textContent = "Save"; }, 1400);
        });
      }

      function setStatus(cls, msg) {
        statusEl.className = "verdict-banner " + cls;
        statusEl.textContent = msg;
      }

      countBtn.addEventListener("click", function () {
        var domain = (domEl.value || "").trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase();
        if (!domain) {
          setStatus("neutral", "Enter a domain to count its backlinks.");
          detailEl.textContent = "";
          metricsEl.style.display = "none";
          return;
        }
        var apiKey = localStorage.getItem("opr_key") || null;
        setStatus("neutral", "Counting backlinks for " + domain + " …");
        detailEl.textContent = "";
        metricsEl.style.display = "none";
        countBtn.disabled = true;

        countBacklinks(domain, apiKey, function (res) {
          countBtn.disabled = false;
          if (!res.ok) {
            setStatus("bad", "Could not fetch backlink data");
            detailEl.textContent = res.error === "HTTP 401" || res.error === "HTTP 403"
              ? "A free API key is required to look up backlink counts — the shared demo key is no longer accepted. Get a free key at domcop.com/openpagerank (30,000 lookups/month) and save it in the field below, then try again."
              : "The Open PageRank service could not be reached (HTTP/network error). Try again in a minute, or add a free API key below for a more reliable connection.";
            return;
          }
          setStatus("good", "✓ Backlink data loaded");
          if (res.backlinks != null) {
            rdEl.textContent = formatCount(res.backlinks);
          } else if (res.referringDomains != null) {
            rdEl.textContent = formatCount(res.referringDomains);
          } else {
            rdEl.textContent = "—";
          }
          rankEl.textContent = res.rank != null ? formatCount(res.rank) : "—";
          scoreEl.textContent = res.opr != null ? res.opr : "—";
          metricsEl.style.display = "grid";
          var parts = [];
          if (res.backlinks != null) parts.push(res.backlinks.toLocaleString() + " total backlinks");
          if (res.referringDomains != null) parts.push(res.referringDomains.toLocaleString() + " referring domains");
          if (parts.length) {
            detailEl.textContent = domain + " has " + parts.join(" and ") + " pointing at it according to the Open PageRank index.";
          } else {
            detailEl.textContent = "This domain is not (yet) in the Open PageRank index — it has zero or very few backlinks.";
          }
        });
      });
    }

    var btn = document.getElementById("check_link");
    if (!btn) return;
    var urlEl = document.getElementById("check_url");
    var targetEl = document.getElementById("check_target");
    var checkStatusEl = document.getElementById("check_status");
    var checkDetailEl = document.getElementById("check_detail");

    function setCheckStatus(cls, msg) {
      checkStatusEl.className = "verdict-banner " + cls;
      checkStatusEl.textContent = msg;
    }

    btn.addEventListener("click", function () {
      var url = (urlEl.value || "").trim();
      var target = (targetEl.value || "").trim();
      if (!url || !target) {
        setCheckStatus("neutral", "Enter both a page URL and a link/keyword to search for.");
        checkDetailEl.textContent = "";
        return;
      }
      if (!/^https?:\/\//i.test(url)) url = "https://" + url;

      setCheckStatus("neutral", "Checking " + url + " …");
      checkDetailEl.textContent = "";
      btn.disabled = true;

      checkPage(url, target, function (res) {
        btn.disabled = false;
        if (!res.ok) {
          setCheckStatus("bad", "Could not fetch the page");
          checkDetailEl.textContent = "The site blocked all automated proxies or the URL is unreachable. Open the page in your browser and search for \"" + target + "\" to confirm manually.";
          return;
        }
        if (res.found) {
          setCheckStatus("good", "✓ Backlink found on the page");
          checkDetailEl.textContent = "The page contains \"" + target + "\". Your link is live.";
        } else {
          setCheckStatus("bad", "✕ Backlink not found");
          checkDetailEl.textContent = "The page did not contain \"" + target + "\". Either the link was removed, the page changed, or the content loads via JavaScript and can't be seen by this simple check.";
        }
      });
    });
  });
})();