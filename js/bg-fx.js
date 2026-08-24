/* AmzLoss background motion layer.
   Injects a fixed, pointer-transparent decorative layer on every page:
   floating geometric shapes + two giant slow-spinning logo watermarks.
   Purely visual: aria-hidden, pointer-events none, skipped for
   prefers-reduced-motion users. */
(function () {
  "use strict";
  try {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  } catch (e) {}

  function init() {
    if (document.querySelector(".amz-fx")) return;
    var brandLogo = document.querySelector(".brand-logo");
    var logo = brandLogo ? brandLogo.getAttribute("src") : "assets/img/favicon.svg";

    var layer = document.createElement("div");
    layer.className = "amz-fx";
    layer.setAttribute("aria-hidden", "true");

    /* kind, left%, top%, size px, duration s */
    var spec = [
      ["ring",  7, 12, 46, 26],
      ["dot",  86, 16, 24, 34],
      ["tri",  70, 66, 40, 30],
      ["plus", 14, 74, 32, 40],
      ["dot",  92, 52, 20, 28],
      ["ring", 38, 88, 54, 36],
      ["sq",   56,  8, 30, 27],
      ["tri",  25, 38, 44, 44],
      ["plus", 79, 86, 28, 33],
      ["dot",  45, 28, 18, 25],
      ["ring",  4, 48, 36, 38],
      ["blob", 62, 42,150, 48]
    ];

    var html = "";
    for (var i = 0; i < spec.length; i++) {
      var s = spec[i];
      html += '<span class="afx ' + s[0] + '" style="left:' + s[1] + "%;top:" + s[2] +
        "%;width:" + s[3] + "px;height:" + s[3] + "px;animation-duration:" + s[4] +
        "s;animation-delay:-" + (i * 3.7 % 20) + 's"></span>';
    }
    html += '<img class="afx amz-mark one" src="' + logo + '" alt="" style="animation-duration:110s">';
    html += '<img class="afx amz-mark two" src="' + logo + '" alt="" style="animation-duration:140s;animation-delay:-60s">';

    layer.innerHTML = html;
    document.body.appendChild(layer);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
