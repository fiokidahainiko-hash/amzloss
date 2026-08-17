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

  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("check_link");
    if (!btn) return;
    var urlEl = document.getElementById("check_url");
    var targetEl = document.getElementById("check_target");
    var statusEl = document.getElementById("check_status");
    var detailEl = document.getElementById("check_detail");

    function setStatus(cls, msg) {
      statusEl.className = "verdict-banner " + cls;
      statusEl.textContent = msg;
    }

    btn.addEventListener("click", function () {
      var url = (urlEl.value || "").trim();
      var target = (targetEl.value || "").trim();
      if (!url || !target) {
        setStatus("neutral", "Enter both a page URL and a link/keyword to search for.");
        detailEl.textContent = "";
        return;
      }
      if (!/^https?:\/\//i.test(url)) url = "https://" + url;

      setStatus("neutral", "Checking " + url + " …");
      detailEl.textContent = "";
      btn.disabled = true;

      checkPage(url, target, function (res) {
        btn.disabled = false;
        if (!res.ok) {
          setStatus("bad", "Could not fetch the page");
          detailEl.textContent = "The site blocked all automated proxies or the URL is unreachable. Open the page in your browser and search for \"" + target + "\" to confirm manually.";
          return;
        }
        if (res.found) {
          setStatus("good", "✓ Backlink found on the page");
          detailEl.textContent = "The page contains \"" + target + "\". Your link is live.";
        } else {
          setStatus("bad", "✕ Backlink not found");
          detailEl.textContent = "The page did not contain \"" + target + "\". Either the link was removed, the page changed, or the content loads via JavaScript and can't be seen by this simple check.";
        }
      });
    });
  });
})();