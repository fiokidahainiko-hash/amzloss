/* AmzLoss Break-Even & Price-Drop Calculator
   Compares commission before/after a price drop and computes break-even volume. */

document.addEventListener('DOMContentLoaded', function () {
  var el = {
    orig: document.getElementById('price_orig'),
    now: document.getElementById('price_new'),
    rate: document.getElementById('rate'),
    volume: document.getElementById('volume'),
    calc: document.getElementById('calc'),
    before: document.getElementById('r_before'),
    after: document.getElementById('r_after'),
    diff: document.getElementById('r_diff'),
    monthBefore: document.getElementById('r_month_before'),
    monthAfter: document.getElementById('r_month_after'),
    breakeven: document.getElementById('r_breakeven'),
    verdict: document.getElementById('verdict')
  };

  function money(v) {
    if (!isFinite(v)) return '—';
    return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function compute() {
    var orig = parseFloat(el.orig.value);
    var now = parseFloat(el.now.value);
    var rate = parseFloat(el.rate.value);
    var volume = parseFloat(el.volume.value);

    if (isNaN(orig) || isNaN(now) || isNaN(rate) || orig <= 0 || now <= 0 || rate <= 0) {
      return;
    }

    var r = rate / 100;
    var before = orig * r;
    var after = now * r;
    var diff = after - before;

    el.before.textContent = money(before);
    el.after.textContent = money(after);
    el.diff.textContent = (diff >= 0 ? '+' : '−') + money(Math.abs(diff));
    el.diff.style.color = diff >= 0 ? 'var(--accent)' : 'var(--danger)';

    var mBefore = isNaN(volume) || volume <= 0 ? 0 : before * volume;
    var mAfter = isNaN(volume) || volume <= 0 ? 0 : after * volume;
    el.monthBefore.textContent = money(mBefore);
    el.monthAfter.textContent = money(mAfter);

    var breakeven = 0;
    if (after > 0) {
      breakeven = mBefore > 0 ? mBefore / after : Math.ceil(volume / (after / before));
      if (mBefore === 0) breakeven = 0;
    }
    var show = breakeven > 0 && breakeven < 100000
      ? (breakeven % 1 === 0 ? breakeven.toLocaleString('en-US') : breakeven.toFixed(1))
      : (breakeven >= 100000 ? '100k+' : '—');
    el.breakeven.textContent = show;

    var cls = 'neutral';
    var msg;
    if (diff === 0) {
      msg = 'No commission change — the drop doesn\u2019t cost you anything per sale.';
    } else if (diff < 0) {
      cls = 'bad';
      var dropPct = (Math.abs(diff) / before * 100);
      msg = 'You lose ' + money(Math.abs(diff)) + ' per sale (' + dropPct.toFixed(1) + '%). Sell ' +
        show + ' instead of ' + (isNaN(volume) ? 'your current' : Math.round(volume).toLocaleString('en-US')) +
        ' to earn the same monthly commission.';
    } else {
      cls = 'good';
      msg = 'Price went up — your commission rises ' + money(diff) + ' per sale.';
    }
    el.verdict.className = 'verdict-banner ' + cls;
    el.verdict.textContent = msg;
  }

  el.calc.addEventListener('click', compute);
  [el.orig, el.now, el.rate, el.volume].forEach(function (input) {
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') compute(); });
  });
  compute();
});