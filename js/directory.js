/* AmzLoss backlink directory.
   Curated list is stored in LIST. Verified submissions from visitors are
   stored in localStorage and rendered so every verified site gets a backlink.
*/
window.AMZLOSS_DIRECTORY = {
  categories: [
    "Affiliate Tools",
    "Blogging",
    "SEO",
    "Reviews",
    "Deals & Coupons",
    "Finance",
    "Lifestyle"
  ],
  LIST: [
    {
      name: "AmzLoss",
      url: "https://amzloss.com",
      category: "Affiliate Tools",
      description: "Audit your Amazon Associates earnings report and compare affiliate network commission rates."
    }
  ]
};

window.AMZLOSS_FORM_ENDPOINT = "https://api.web3forms.com/submit";
window.AMZLOSS_ACCESS_KEY = "REPLACE_WITH_YOUR_WEB3FORMS_ACCESS_KEY";

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