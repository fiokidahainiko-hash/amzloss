/* AmzLoss — Paystack Inline integration for a static site (no backend needed).
   Replace the placeholders below with YOUR values from the Paystack dashboard
   (Settings -> API Keys -> Public key, and your Plan codes). See README.md. */

window.AMZLOSS_PAYSTACK = {
  // Your Paystack PUBLIC key (starts with pk_live_ or pk_test_). Never use a secret key here.
  publicKey: 'pk_live_a06ea15d2fba12ca23f7d27fe64616dddd09b30e',
  // Plan codes from Paystack dashboard (Plans). Keep '' to charge one-time instead.
  plans: {
    weekly:  'PLN_vfo108j9wkllbsz',
    monthly: 'PLN_3f7h8jco1o9sygr',
    yearly:  'PLN_2r66t7z4z7oj0jo'
  },
  // Fallback one-time amounts in the smallest currency unit (NGN -> kobo) if no plan.
  amountsCents: {
    weekly:  0,
    monthly: 0,
    yearly:  0
  },
  currency: 'NGN', // your Paystack plan currency; USD or NGN
  // Where the customer lands after a successful payment:
  successUrl: 'pricing.html?status=success',
  // A short prefix for transaction references:
  refPrefix: 'AMZ'
};

/* Open Paystack checkout. `tier` must be 'weekly' | 'monthly' | 'yearly'.
   `email` is required by Paystack. */
function paystackCheckout(tier, email) {
  var cfg = window.AMZLOSS_PAYSTACK;
  var plan = (cfg.plans && cfg.plans[tier]) || '';

  if (typeof PaystackPop === 'undefined') {
    alert('Payment is temporarily unavailable. Please try again in a moment.');
    return;
  }

  var handler = PaystackPop.setup({
    key: cfg.publicKey,
    email: email,
    plan: plan,                       // subscription plan code (recurring billing)
    amount: plan ? 0 : (cfg.amountsCents[tier] || 0), // one-time only when no plan
    currency: cfg.currency,
    ref: cfg.refPrefix + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    metadata: { custom_fields: [{ display_name: 'Plan', variable_name: 'plan', value: tier }] },
    callback: function (response) {
      window.location.href = cfg.successUrl + '&ref=' + response.reference + '&tier=' + tier;
    },
    onClose: function () { /* user closed the popup; no action needed */ }
  });
  handler.openIframe();
}

/* Convenience: read an email input on the page and start checkout. */
function paystackSubscribe(tier) {
  var emailEl = document.getElementById('email');
  var email = emailEl ? emailEl.value.trim() : '';
  var warnEl = document.getElementById('emailWarn');
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    if (warnEl) { warnEl.style.display = 'block'; warnEl.textContent = 'Please enter your email above so Paystack can send your receipt.'; }
    if (emailEl) emailEl.focus();
    return;
  }
  if (warnEl) warnEl.style.display = 'none';
  paystackCheckout(tier, email);
}

/* ---- Paid-status helper (client-side, static-site friendly) ----
   Since there is no backend, an active subscription is stored in
   localStorage with an expiry per plan. It is a convenience unlock,
   not bulletproof DRM. */
window.AMZLOSS_PAID = {
  KEY: 'amzloss_paid_until',
  DAY: 24 * 60 * 60 * 1000,
  /* Launch offer: for the first 30 days the whole tool is free with no
     ads. Change this to a past date once the launch period ends. */
  LAUNCH_FREE_UNTIL: new Date('2026-09-10T23:59:59').getTime(),
  /* Unlock the tool for a custom number of days (used by sponsor codes). */
  activateDays: function (days) {
    try {
      var until = Date.now() + days * this.DAY;
      localStorage.setItem(this.KEY, String(until));
      return true;
    } catch (e) { return false; }
  },
  activate: function (tier) {
    var days = { weekly: 7, monthly: 30, yearly: 365 }[tier] || 30;
    return this.activateDays(days);
  },
  isPaid: function () {
    if (Date.now() < this.LAUNCH_FREE_UNTIL) return true;
    try {
      var until = parseInt(localStorage.getItem(this.KEY) || '0', 10);
      return until > Date.now();
    } catch (e) { return false; }
  },
  isLaunch: function () {
    return Date.now() < this.LAUNCH_FREE_UNTIL;
  },
  msLeft: function () {
    try {
      var until = parseInt(localStorage.getItem(this.KEY) || '0', 10);
      return Math.max(0, until - Date.now());
    } catch (e) { return 0; }
  }
};

/* Attach data-paystack="tier" buttons automatically when this script loads. */
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('[data-paystack]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      paystackSubscribe(btn.getAttribute('data-paystack'));
    });
  });

  /* If we landed back on the site after a successful payment, unlock.
     Handles both the ?status=success URL and a fresh checkout callback. */
  var tier = new URLSearchParams(window.location.search).get('tier');
  if (tier && window.AMZLOSS_PAID) {
    window.AMZLOSS_PAID.activate(tier);
  }
});
