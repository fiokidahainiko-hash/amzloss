/* AmzLoss internationalisation.
   - Auto-detects visitor language from the URL's /<lang>/ segment first,
     then navigator.language (browser/OS locale). Remembers explicit choice.
   - Localises elements with data-i18n="key" using STRINGS.
   - Language switcher: for pages with a proper translated counterpart it
     navigates between /<lang>/<page> and /<page>; otherwise it offers
     on-the-fly machine translation (widget fallback). */

var LANGS = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
  { code: "fr", label: "Français" }
];

/* Pages that have proper translations in every launch language.
   Expand this list as more pages are translated. */
var AMZ_TRANSLATED_PAGES = ["index.html"];

var STRINGS = {
  en: {
    "nav.amazon": "Amazon Tools",
    "nav.more": "More Tools",
    "nav.pricing": "Pricing",
    "nav.learn": "Learn",
    "nav.faq": "FAQ",
    "nav.about": "About",
    "nav.audit": "Audit my report",
    "follow.title": "Follow us",
    "lang.bar": "Language",
    "lang.auto": "Auto",
    "lang.translate": "Translate this page"
  },
  es: {
    "nav.amazon": "Herramientas de Amazon",
    "nav.more": "Más herramientas",
    "nav.pricing": "Precios",
    "nav.learn": "Aprende",
    "nav.faq": "Preguntas",
    "nav.about": "Acerca de",
    "nav.audit": "Audita mi reporte",
    "follow.title": "Síguenos",
    "lang.bar": "Idioma",
    "lang.auto": "Automático",
    "lang.translate": "Traducir esta página"
  },
  de: {
    "nav.amazon": "Amazon-Tools",
    "nav.more": "Weitere Tools",
    "nav.pricing": "Preise",
    "nav.learn": "Lernen",
    "nav.faq": "FAQ",
    "nav.about": "Über uns",
    "nav.audit": "Meinen Bericht prüfen",
    "follow.title": "Folge uns",
    "lang.bar": "Sprache",
    "lang.auto": "Auto",
    "lang.translate": "Diese Seite übersetzen"
  },
  pt: {
    "nav.amazon": "Ferramentas Amazon",
    "nav.more": "Mais ferramentas",
    "nav.pricing": "Preços",
    "nav.learn": "Aprenda",
    "nav.faq": "Perguntas",
    "nav.about": "Sobre",
    "nav.audit": "Auditar meu relatório",
    "follow.title": "Siga-nos",
    "lang.bar": "Idioma",
    "lang.auto": "Automático",
    "lang.translate": "Traduzir esta página"
  },
  fr: {
    "nav.amazon": "Outils Amazon",
    "nav.more": "Plus d'outils",
    "nav.pricing": "Tarifs",
    "nav.learn": "Apprendre",
    "nav.faq": "FAQ",
    "nav.about": "À propos",
    "nav.audit": "Auditer mon rapport",
    "follow.title": "Suivez-nous",
    "lang.bar": "Langue",
    "lang.auto": "Auto",
    "lang.translate": "Traduire cette page"
  }
};

function amzNorm(code) {
  if (!code) return "en";
  var base = String(code).slice(0, 2).toLowerCase();
  return LANGS.some(function (l) { return l.code === base; }) ? base : "en";
}

function amzPathLang() {
  var m = window.location.pathname.match(/\/(es|de|pt|fr)\//);
  return m ? m[1] : null;
}

function amzDetect() {
  var saved = null;
  try { saved = localStorage.getItem("amzloss_lang"); } catch (e) {}
  if (saved === "auto") saved = null;
  if (saved) return amzNorm(saved);
  var p = amzPathLang();
  if (p) return p;
  var nav = (navigator.language || (navigator.languages && navigator.languages[0]) || "en");
  return amzNorm(nav);
}

function amzCurrentFile() {
  var path = window.location.pathname;
  var parts = path.split("/");
  var file = parts[parts.length - 1];
  if (!file || file === "") file = "index.html";
  return file;
}

function amzPeerPath(lang) {
  var path = window.location.pathname;
  var p = amzPathLang();
  if (p) return path.replace("/" + p + "/", "/" + (lang === "en" ? "" : lang + "/"));
  if (lang === "en") return path;
  var base = path.endsWith("/") ? path : path + "/";
  return "/" + lang + base;
}

function amzPeerExists(lang, file) {
  return lang === "en" || AMZ_TRANSLATED_PAGES.indexOf(file) !== -1;
}

function amzApply(lang) {
  var dict = STRINGS[lang] || STRINGS.en;
  document.documentElement.setAttribute("lang", lang);
  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    var key = el.getAttribute("data-i18n");
    if (dict[key]) el.textContent = dict[key];
  });
  try { localStorage.setItem("amzloss_lang", lang); } catch (e) {}
}

function amzSwitch(lang) {
  amzApply(lang);
  var file = amzCurrentFile();
  if (lang === "en" || amzPeerExists(lang, file)) {
    var peer = amzPeerPath(lang);
    if (peer && peer !== window.location.pathname) window.location.href = peer;
  } else {
    amzLoadTranslator();
  }
}

function amzBuildBar() {
  var bar = document.createElement("div");
  bar.id = "lang-bar";
  bar.style.cssText = "display:flex;align-items:center;gap:6px;padding:6px 14px;background:#0b1220;color:#cdd5e3;font-size:.85rem;flex-wrap:wrap;";
  var label = document.createElement("span");
  label.setAttribute("data-i18n", "lang.bar");
  label.textContent = STRINGS.en["lang.bar"];
  bar.appendChild(label);

  var auto = document.createElement("button");
  auto.type = "button";
  auto.setAttribute("data-i18n", "lang.auto");
  auto.textContent = STRINGS.en["lang.auto"];
  auto.style.cssText = "border:1px solid #2a3650;background:transparent;color:inherit;padding:3px 8px;border-radius:6px;cursor:pointer;";
  auto.addEventListener("click", function () {
    try { localStorage.setItem("amzloss_lang", "auto"); } catch (e) {}
    var p = amzPathLang();
    amzApply(p || amzNorm(navigator.language));
  });
  bar.appendChild(auto);

  var current = amzDetect();
  LANGS.forEach(function (l) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = l.label;
    b.style.cssText = "border:1px solid #2a3650;background:transparent;color:inherit;padding:3px 8px;border-radius:6px;cursor:pointer;";
    if (l.code === current) b.style.borderColor = "#f5a623";
    b.addEventListener("click", function () { amzSwitch(l.code); });
    bar.appendChild(b);
  });

  var tr = document.createElement("button");
  tr.type = "button";
  tr.setAttribute("data-i18n", "lang.translate");
  tr.textContent = STRINGS.en["lang.translate"];
  tr.style.cssText = "border:1px solid #f5a623;background:transparent;color:#f5a623;padding:3px 8px;border-radius:6px;cursor:pointer;margin-left:6px;";
  tr.addEventListener("click", amzLoadTranslator);
  bar.appendChild(tr);

  var ref = document.querySelector(".launch-bar");
  if (ref && ref.parentNode) ref.parentNode.insertBefore(bar, ref.nextSibling);
  else document.body.insertBefore(bar, document.body.firstChild);
}

var amzTranslatorLoaded = false;
function amzLoadTranslator() {
  if (amzTranslatorLoaded) return;
  amzTranslatorLoaded = true;
  var s = document.createElement("script");
  s.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  window.googleTranslateElementInit = function () {
    new window.google.translate.TranslateElement(
      { pageLanguage: "en", includedLanguages: "es,de,pt,fr", layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE },
      "google_translate_element"
    );
  };
  var holder = document.createElement("div");
  holder.id = "google_translate_element";
  holder.style.cssText = "padding:4px 14px;";
  document.body.appendChild(holder);
  document.body.appendChild(s);
}

document.addEventListener("DOMContentLoaded", function () {
  var detected = amzDetect();
  var pageLang = amzPathLang() || "en";
  var saved = null;
  try { saved = localStorage.getItem("amzloss_lang"); } catch (e) {}
  if ((!saved || saved === "auto") && pageLang !== detected && amzPeerExists(detected, amzCurrentFile())) {
    window.location.href = amzPeerPath(detected);
    return;
  }
  amzApply(detected);
  amzBuildBar();
});
