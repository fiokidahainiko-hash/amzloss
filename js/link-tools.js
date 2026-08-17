/* AmzLoss Link Tools — Amazon affiliate link builder + backlink checker.
   Everything runs in the browser. */

document.addEventListener('DOMContentLoaded', function () {
  /* ---------- Copy buttons ---------- */
  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = document.getElementById(btn.getAttribute('data-copy'));
      if (!target || !target.value) return;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(target.value).then(function () {
          flash(btn, 'Copied!');
        });
      } else {
        target.select();
        document.execCommand('copy');
        flash(btn, 'Copied!');
      }
    });
  });
  function flash(btn, msg) {
    var old = btn.textContent;
    btn.textContent = msg;
    setTimeout(function () { btn.textContent = old; }, 1400);
  }

  /* ---------- Affiliate link builder ---------- */
  function cleanUrl(raw) {
    if (!raw) return '';
    var u = raw.trim();
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    try {
      var parsed = new URL(u);
      parsed.search = ''; // drop all existing tracking params
      return parsed.toString();
    } catch (err) { return u; }
  }

  document.getElementById('build_link').addEventListener('click', function () {
    var base = cleanUrl(document.getElementById('product_url').value);
    var tag = document.getElementById('tracking_id').value.trim();
    var text = document.getElementById('link_text').value.trim() || 'Check price on Amazon';

    if (!base || !/amazon\./.test(base)) {
      document.getElementById('out_url').value = '';
      document.getElementById('out_snippet').value = '';
      document.getElementById('out_markdown').value = '';
      return;
    }
    if (tag) {
      var sep = base.indexOf('?') === -1 ? '?' : '&';
      base = base + sep + 'tag=' + encodeURIComponent(tag);
    }
    var snippet = '<a href="' + base + '" rel="nofollow sponsored">' + text + '</a>';
    var markdown = '[' + text + '](' + base + ')';

    document.getElementById('out_url').value = base;
    document.getElementById('out_snippet').value = snippet;
    document.getElementById('out_markdown').value = markdown;
  });

  });