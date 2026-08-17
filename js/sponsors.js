/* AmzLoss — Sponsor access codes.
   Add a sponsor code here when a sponsor signs up and notifies you.
   Each code unlocks the full tool for 90 days (3 months) for whoever enters it.
   Format: '<CODE>': '<Sponsor site name>'   */

window.AMZLOSS_SPONSORS = {
  codes: {
    // Example:  'AMZLOSS-ABCD-1234': 'Example Blog',
  },
  unlockDays: 90
};

/* Validate a code and unlock if it's valid. Returns the sponsor name or null. */
window.AMZLOSS_SPONSORS.redeem = function (code) {
  var trimmed = String(code || '').trim();
  var name = this.codes[trimmed];
  if (!name) return null;
  if (window.AMZLOSS_PAID && window.AMZLOSS_PAID.activateDays) {
    window.AMZLOSS_PAID.activateDays(this.unlockDays);
  }
  return name;
};