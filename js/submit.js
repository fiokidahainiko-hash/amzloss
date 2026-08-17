/* AmzLoss URL Submitter — blast one URL across 28+ platforms with saved progress. */
(function () {
  "use strict";

  var PLATFORMS = [
    /* ---- Search Engines & Indexing ---- */
    { id: "google", cat: "Search Engines", icon: "🔍", name: "Google Search Console", url: "https://search.google.com/search-console", type: "page", desc: "Add your site as a property and submit your sitemap — the #1 fastest way to get indexed by Google." },
    { id: "bing", cat: "Search Engines", icon: "🔷", name: "Bing Webmaster Tools", url: "https://www.bing.com/webmasters", type: "page", desc: "Add and submit your site to Bing. It also powers ChatGPT search results." },
    { id: "yandex", cat: "Search Engines", icon: "🇷🇺", name: "Yandex Webmaster", url: "https://webmaster.yandex.com/", type: "page", desc: "Submit to Yandex — one of the largest search engines outside Google." },
    { id: "indexnow", cat: "Search Engines", icon: "⚡", name: "IndexNow", url: "https://www.indexnow.org/", type: "page", desc: "A one-protocol ping used by Bing, Yandex, Seznam, Naver and others for near-instant indexing." },
    { id: "duckduckgo", cat: "Search Engines", icon: "🦆", name: "DuckDuckGo", url: "https://duckduckgo.com/webmaster", type: "page", desc: "Submit via the DuckDuckGo webmaster program for inclusion in its index." },
    { id: "brave", cat: "Search Engines", icon: "🦁", name: "Brave Search", url: "https://search.brave.com/help/indexing", type: "page", desc: "Request indexing on Brave Search, the privacy-first engine with an open index." },

    /* ---- Web Directories ---- */
    { id: "chamber", cat: "Web Directories", icon: "🏛️", name: "Chamber of Commerce", url: "https://www.chamberofcommerce.com/add-your-business", type: "page", desc: "Free business directory listing that search engines trust." },
    { id: "manta", cat: "Web Directories", icon: "📇", name: "Manta", url: "https://www.manta.com/add-my-company", type: "page", desc: "One of the oldest free small-business directories on the web." },
    { id: "cylex", cat: "Web Directories", icon: "🗂️", name: "Cylex", url: "https://www.cylex.us/", type: "page", desc: "International free business directory with decent domain authority." },
    { id: "hotfrog", cat: "Web Directories", icon: "🐸", name: "Hotfrog", url: "https://www.hotfrog.com/", type: "page", desc: "Free directory with strong local search visibility." },
    { id: "merchantcircle", cat: "Web Directories", icon: "⭕", name: "MerchantCircle", url: "https://www.merchantcircle.com/", type: "page", desc: "Free listing that often ranks for local queries." },
    { id: "yelp", cat: "Web Directories", icon: "💛", name: "Yelp", url: "https://www.yelp.com/business/add", type: "page", desc: "Claim your business on Yelp — even service sites benefit from the citation." },
    { id: "bingplaces", cat: "Web Directories", icon: "📌", name: "Bing Places", url: "https://www.bingplaces.com/", type: "page", desc: "Free Bing business listing that feeds into Microsoft's index." },
    { id: "foursquare", cat: "Web Directories", icon: "📍", name: "Foursquare", url: "https://foursquare.com/add-business", type: "page", desc: "Add a free business profile used by many map apps and data aggregators." },

    /* ---- Social Bookmarking & Sharing ---- */
    { id: "reddit", cat: "Social & Bookmarking", icon: "🤖", name: "Reddit", url: "https://www.reddit.com/submit?url={url}", type: "direct", desc: "Pre-filled Reddit post — bookmarking is free backlinks and real traffic." },
    { id: "pocket", cat: "Social & Bookmarking", icon: "🔖", name: "Pocket", url: "https://getpocket.com/save?url={url}", type: "direct", desc: "Save the page to Pocket — a save is a lightweight engagement signal." },
    { id: "digg", cat: "Social & Bookmarking", icon: "⛏️", name: "Digg", url: "https://digg.com/submit?url={url}", type: "direct", desc: "Submit to Digg with your URL pre-filled." },
    { id: "mix", cat: "Social & Bookmarking", icon: "🎨", name: "Mix", url: "https://mix.com/add?url={url}", type: "direct", desc: "The successor to StumbleUpon — a vote here sends real referrals." },
    { id: "pinterest", cat: "Social & Bookmarking", icon: "📌", name: "Pinterest", url: "https://www.pinterest.com/pin/create/button/?url={url}", type: "direct", desc: "Create a pin from your page — perfect for visual content." },
    { id: "facebook", cat: "Social & Bookmarking", icon: "📘", name: "Facebook", url: "https://www.facebook.com/sharer/sharer.php?u={url}", type: "direct", desc: "Share the page to Facebook with your URL pre-filled." },
    { id: "x", cat: "Social & Bookmarking", icon: "𝕏", name: "X (Twitter)", url: "https://twitter.com/intent/tweet?url={url}", type: "direct", desc: "Post a tweet with your link — social signals + referral traffic." },
    { id: "linkedin", cat: "Social & Bookmarking", icon: "💼", name: "LinkedIn", url: "https://www.linkedin.com/shareArticle?mini=true&url={url}", type: "direct", desc: "Share on LinkedIn — especially effective for B2B and portfolio pages." },
    { id: "whatsapp", cat: "Social & Bookmarking", icon: "💬", name: "WhatsApp", url: "https://api.whatsapp.com/send?text={url}", type: "direct", desc: "Send your page to WhatsApp contacts and groups." },
    { id: "telegram", cat: "Social & Bookmarking", icon: "✈️", name: "Telegram", url: "https://t.me/share/url?url={url}", type: "direct", desc: "Share instantly to Telegram channels and chats." },
    { id: "tumblr", cat: "Social & Bookmarking", icon: "🟦", name: "Tumblr", url: "https://www.tumblr.com/widgets/share/tool?canonicalUrl={url}", type: "direct", desc: "Reblog your page on Tumblr with the URL pre-filled." },
    { id: "buffer", cat: "Social & Bookmarking", icon: "🎛️", name: "Buffer", url: "https://buffer.com/add?url={url}", type: "direct", desc: "Queue the link into your social posting schedule." },

    /* ---- Ping Services ---- */
    { id: "pingomatic", cat: "Ping Services", icon: "📡", name: "Ping-O-Matic", url: "https://pingomatic.com/", type: "page", desc: "The classic free pinger — tells dozens of aggregators your page changed." },
    { id: "pingler", cat: "Ping Services", icon: "🛰️", name: "Pingler", url: "https://pingler.com/", type: "page", desc: "Free ping service that notifies search engines and directories." },
    { id: "superping", cat: "Ping Services", icon: "⚡", name: "SuperPing", url: "https://superping.com/", type: "page", desc: "Pings multiple indexes and blog search engines at once." },
    { id: "myping", cat: "Ping Services", icon: "📣", name: "MyPing", url: "https://mypingboard.com/", type: "page", desc: "Free bulk pinger covering major engines and feed readers." },
    { id: "pingmyurl", cat: "Ping Services", icon: "🔔", name: "PingMyURL", url: "https://www.pingmyurl.com/", type: "page", desc: "Submit and ping your URL to multiple crawlers in one go." }
  ];

  var CATS = [
    { id: "Search Engines", icon: "🔍", tag: "Get indexed" },
    { id: "Web Directories", icon: "📇", tag: "Backlinks" },
    { id: "Social & Bookmarking", icon: "📌", tag: "Traffic + links" },
    { id: "Ping Services", icon: "📡", tag: "Speed up discovery" }
  ];

  var $ = function (s) { return document.querySelector(s); };
  var urlInput = $("#url_input");
  var blastBtn = $("#blast_btn");
  var results = $("#results");
  var countEl = $("#blast_count");
  var radialEl = $("#blast_radial");
  var fillEl = $("#blast_fill");
  var tipEl = $("#blast_tip");

  var state = { url: "", done: {} };

  function keyFor(url) { return "amzloss_submit_" + url; }

  function load() {
    var stored = localStorage.getItem("amzloss_submit_url");
    if (stored) { urlInput.value = stored; state.url = stored; }
    try {
      var done = JSON.parse(localStorage.getItem(keyFor(state.url) || "") || "{}");
      if (done && typeof done === "object") state.done = done;
    } catch (e) { state.done = {}; }
  }

  function save() {
    if (!state.url) return;
    localStorage.setItem("amzloss_submit_url", state.url);
    localStorage.setItem(keyFor(state.url), JSON.stringify(state.done));
  }

  function normalizeUrl(raw) {
    var u = (raw || "").trim();
    if (!u) return null;
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    try {
      var p = new URL(u);
      if (!/\./.test(p.hostname)) return null;
      return p.href.replace(/\/$/, "");
    } catch (e) { return null; }
  }

  function buildLink(plat, url) {
    return plat.url.replace("{url}", encodeURIComponent(url));
  }

  function updateProgress() {
    var total = PLATFORMS.length;
    var done = 0;
    for (var i = 0; i < PLATFORMS.length; i++) if (state.done[PLATFORMS[i].id]) done++;
    var pct = Math.round((done / total) * 100);
    countEl.innerHTML = done + "<span>/" + total + "</span>";
    radialEl.textContent = pct + "%";
    radialEl.style.setProperty("--pct", pct);
    fillEl.style.width = pct + "%";
    if (pct === 100) {
      tipEl.textContent = "✅ All " + total + " platforms submitted! Check back in a few days — your site should start appearing in searches and picking up backlinks.";
      tipEl.style.color = "var(--accent)";
    } else if (done > 0) {
      tipEl.textContent = "Nice — " + done + " of " + total + " done. Every extra platform is another indexing signal and another backlink. Keep going!";
      tipEl.style.color = "";
    } else {
      tipEl.textContent = "Enter a URL above, then click every platform. More platforms = faster indexing + more backlinks.";
      tipEl.style.color = "";
    }
  }

  function cardFor(plat, url) {
    var el = document.createElement("div");
    el.className = "plat-card" + (state.done[plat.id] ? " done" : "");
    el.dataset.id = plat.id;
    var btnLabel = state.done[plat.id] ? "✓ Submitted" : (plat.type === "direct" ? "Open & submit →" : "Open submit page →");
    el.innerHTML =
      '<div class="plat-icon">' + plat.icon + "</div>" +
      '<div class="plat-body">' +
      '<h4>' + plat.name + "</h4>" +
      '<p>' + plat.desc + "</p>" +
      "</div>" +
      '<div class="plat-actions">' +
      '<a class="btn btn-primary btn-sm plat-go" href="' + buildLink(plat, url) + '" target="_blank" rel="noopener nofollow">' + btnLabel + "</a>" +
      '<button class="btn btn-ghost btn-sm plat-done">' + (state.done[plat.id] ? "Undo" : "Mark done") + "</button>" +
      "</div>";
    el.querySelector(".plat-go").addEventListener("click", function (e) {
      e.preventDefault();
      markDone(plat, true);
      window.open(buildLink(plat, url), "_blank", "noopener");
    });
    el.querySelector(".plat-done").addEventListener("click", function () {
      toggleDone(plat);
    });
    return el;
  }

  function markDone(plat, val) {
    if (val) state.done[plat.id] = true; else delete state.done[plat.id];
    save();
    updateProgress();
    var card = results.querySelector('.plat-card[data-id="' + plat.id + '"]');
    if (card) {
      card.classList.toggle("done", !!state.done[plat.id]);
      var go = card.querySelector(".plat-go");
      go.textContent = state.done[plat.id] ? "✓ Submitted" : (plat.type === "direct" ? "Open & submit →" : "Open submit page →");
      card.querySelector(".plat-done").textContent = state.done[plat.id] ? "Undo" : "Mark done";
    }
  }

  function toggleDone(plat) {
    if (state.done[plat.id]) delete state.done[plat.id]; else state.done[plat.id] = true;
    save();
    updateProgress();
    var card = results.querySelector('.plat-card[data-id="' + plat.id + '"]');
    if (card) {
      card.classList.toggle("done", !!state.done[plat.id]);
      var go = card.querySelector(".plat-go");
      go.textContent = state.done[plat.id] ? "✓ Submitted" : (plat.type === "direct" ? "Open & submit →" : "Open submit page →");
      card.querySelector(".plat-done").textContent = state.done[plat.id] ? "Undo" : "Mark done";
    }
  }

  function render() {
    results.innerHTML = "";
    results.style.display = "";
    for (var c = 0; c < CATS.length; c++) {
      var cat = CATS[c];
      var list = PLATFORMS.filter(function (p) { return p.cat === cat.id; });
      if (!list.length) continue;
      var group = document.createElement("div");
      group.className = "plat-group";
      var head = document.createElement("div");
      head.className = "plat-group-head";
      head.innerHTML = '<span class="plat-group-icon">' + cat.icon + "</span>" +
        "<div><h3>" + cat.id + "</h3><p>" + cat.tag + "</p></div>" +
        '<span class="plat-group-count">' + list.length + " platforms</span>";
      group.appendChild(head);
      var grid = document.createElement("div");
      grid.className = "plat-grid";
      for (var i = 0; i < list.length; i++) grid.appendChild(cardFor(list[i], state.url));
      group.appendChild(grid);
      results.appendChild(group);
    }
    var summary = document.createElement("p");
    summary.className = "plat-summary";
    summary.innerHTML = "You are submitting <strong>" + state.url + "</strong>. Open each platform, paste or confirm your URL, and hit " +
      "<strong>Mark done</strong>. Progress is saved in this browser, so you can come back and finish anytime.";
    results.insertBefore(summary, results.firstChild);
    updateProgress();
  }

  function blast() {
    var u = normalizeUrl(urlInput.value);
    if (!u) {
      urlInput.focus();
      urlInput.style.borderColor = "var(--danger)";
      setTimeout(function () { urlInput.style.borderColor = ""; }, 1400);
      tipEl.textContent = "Please enter a valid URL like https://yoursite.com";
      return;
    }
    state.url = u;
    urlInput.value = u;
    save();
    render();
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  blastBtn.addEventListener("click", blast);
  urlInput.addEventListener("keydown", function (e) { if (e.key === "Enter") blast(); });
  $("#reset_btn").addEventListener("click", function () {
    if (!state.url) return;
    state.done = {};
    localStorage.removeItem(keyFor(state.url));
    save();
    updateProgress();
    var cards = results.querySelectorAll(".plat-card");
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      card.classList.remove("done");
      var go = card.querySelector(".plat-go");
      var plat = PLATFORMS.filter(function (p) { return p.id === card.dataset.id; })[0];
      go.textContent = plat.type === "direct" ? "Open & submit →" : "Open submit page →";
      card.querySelector(".plat-done").textContent = "Mark done";
    }
  });

  load();
  updateProgress();
})();