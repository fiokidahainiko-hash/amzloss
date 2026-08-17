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

  /* ---------- Backlink checker ---------- */
  var PROXY = 'https://api.allorigins.win/raw?url=';

  function setStatus(el, cls, msg) {
    el.className = 'verdict-banner ' + cls;
    el.textContent = msg;
  }

  document.getElementById('check_link').addEventListener('click', function () {
    var url = document.getElementById('check_url').value.trim();
    var target = document.getElementById('check_target').value.trim();
    var status = document.getElementById('check_status');
    var detail = document.getElementById('check_detail');

    if (!url || !target) {
      setStatus(status, 'neutral', 'Enter both a page URL and a keyword/link to search for.');
      detail.textContent = '';
      return;
    }
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    var needle = target.toLowerCase();

    setStatus(status, 'neutral', 'Checking ' + url + ' …');
    detail.textContent = '';

    fetch(PROXY + encodeURIComponent(url))
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (html) {
        var found = html.toLowerCase().indexOf(needle) !== -1;
        if (found) {
          setStatus(status, 'good', '✓ Backlink found on the page');
          detail.textContent = 'The page contains "' + target + '". Your link is live.';
        } else {
          setStatus(status, 'bad', '✕ Backlink not found');
          detail.textContent = 'The page did not contain "' + target + '". Either the link was removed, the page changed, or the page content loaded dynamically (JavaScript) and can\u2019t be seen by this simple check.';
        }
      })
      .catch(function (err) {
        setStatus(status, 'bad', 'Could not fetch the page');
        detail.textContent = 'The site blocked automated requests or the URL is unreachable (' + err.message + '). Open the page in your browser and search for "' + target + '" to confirm manually.';
      });
  });
});