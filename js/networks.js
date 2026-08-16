/* AmzLoss multi-network affiliate rate data — advisory estimates only.
   Rates are typical published ranges by network/category. Always check the
   network's merchant terms for the rate that actually applies to you.
*/
window.AMZLOSS_NETWORKS = {
  "ShareASale": {
    "Fashion & Apparel": 12,
    "Beauty & Cosmetics": 10,
    "Home & Garden": 8,
    "Health & Wellness": 8,
    "Pets": 8,
    "Electronics": 4,
    "Food & Beverage": 5,
    "Toys & Baby": 6,
    "Travel & Experiences": 5,
    "Software & SaaS": 20
  },
  "CJ Affiliate": {
    "Fashion & Apparel": 8,
    "Beauty": 8,
    "Home & Garden": 6,
    "Electronics": 3,
    "Sports & Outdoors": 5,
    "Food & Beverage": 4,
    "Travel": 4,
    "Office & Supplies": 4,
    "Software & SaaS": 15,
    "Financial Services": 25
  },
  "Impact": {
    "Fashion": 10,
    "Beauty": 8,
    "Home & Garden": 6,
    "Electronics": 3,
    "Travel": 5,
    "Software & SaaS": 18,
    "Gaming": 5,
    "Health & Fitness": 7,
    "Toys & Baby": 6,
    "Food & Beverage": 4
  },
  "Awin": {
    "Fashion": 7,
    "Beauty": 8,
    "Travel": 5,
    "Home & Garden": 6,
    "Electronics": 3,
    "Health": 6,
    "Food & Beverage": 4,
    "Software & SaaS": 15,
    "Toys": 5,
    "Pets": 6
  },
  "Rakuten Advertising": {
    "Fashion & Luxury": 8,
    "Beauty": 8,
    "Home & Garden": 5,
    "Electronics": 2.5,
    "Travel": 5,
    "Food & Beverage": 3,
    "Toys & Baby": 4,
    "Health & Beauty": 6
  },
  "eBay Partner Network": {
    "Consumer Electronics": 3.5,
    "Fashion": 3.5,
    "Home & Garden": 3.5,
    "Sports & Outdoors": 3.5,
    "Toys": 3.5,
    "Auto Parts": 3.5,
    "Collectibles & Art": 3.5,
    "Other": 1
  },
  "AliExpress": {
    "Electronics": 5,
    "Fashion": 5,
    "Home & Garden": 5,
    "Beauty": 5,
    "Toys": 5,
    "Sports & Outdoors": 5,
    "Auto Accessories": 5
  },
  "Temu": {
    "Fashion & Apparel": 10,
    "Home & Kitchen": 10,
    "Beauty & Health": 10,
    "Electronics": 10,
    "Toys & Games": 10,
    "Pets": 10,
    "Sports & Outdoors": 10
  },
  "Etsy (via Awin)": {
    "Handmade & Craft": 4,
    "Jewelry": 4,
    "Home Decor": 4,
    "Art & Prints": 4,
    "Clothing": 4,
    "Stationery": 4
  },
  "Walmart (CJ)": {
    "Electronics": 1.5,
    "Home & Garden": 2,
    "Fashion": 3,
    "Toys": 2,
    "Grocery": 1,
    "Sports & Outdoors": 2,
    "Beauty": 2.5
  }
};

document.addEventListener('DOMContentLoaded', function () {
  var burger = document.querySelector('.burger');
  var navLinks = document.querySelector('.nav-links');
  var navCta = document.querySelector('.nav-cta');
  if (!burger || !navLinks) return;

  var isOpen = false;
  var mediaQuery = window.matchMedia('(max-width: 900px)');
  var mobileCtaAdded = false;

  function openMenu() {
    navLinks.classList.add('open');
    burger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    isOpen = true;
    if (mediaQuery.matches && navCta && !mobileCtaAdded) {
      var ctaClone = navCta.cloneNode(true);
      ctaClone.classList.add('mobile-cta');
      ctaClone.style.cssText = 'display:flex;flex-direction:column;width:100%;margin-top:8px;padding:0 16px 16px;';
      ctaClone.querySelectorAll('a').forEach(function (a) {
        a.style.cssText = 'width:100%;text-align:center;padding:14px 16px;font-size:1.05rem;';
      });
      navLinks.appendChild(ctaClone);
      mobileCtaAdded = true;
    }
  }
  function closeMenu() {
    navLinks.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    isOpen = false;
  }
  function toggleMenu() { isOpen ? closeMenu() : openMenu(); }

  burger.addEventListener('click', toggleMenu);

  navLinks.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () { if (mediaQuery.matches) closeMenu(); });
  });

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen) closeMenu(); });

  mediaQuery.addEventListener('change', function (e) { if (!e.matches && isOpen) closeMenu(); });
});