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
    "Lifestyle",
    "Tech & Software",
    "SaaS",
    "Web Development",
    "Coding & Programming",
    "AI & Machine Learning",
    "Gadgets & Electronics",
    "Gaming",
    "Fashion & Apparel",
    "Beauty & Cosmetics",
    "Health & Fitness",
    "Wellness & Mental Health",
    "Fitness Equipment",
    "Nutrition & Supplements",
    "Home & Garden",
    "Home Improvement",
    "Interior Design",
    "Kitchen & Cooking",
    "Food & Recipes",
    "Pets & Pet Care",
    "Travel & Tourism",
    "Vacation Rentals",
    "Automotive & Cars",
    "Motorcycles",
    "Sports & Outdoors",
    "Fishing & Hunting",
    "Outdoor Gear",
    "Photography",
    "Videography & Editing",
    "Music & Audio",
    "Books & Reading",
    "Education & E-learning",
    "Online Courses",
    "Career & Jobs",
    "Business & Entrepreneurship",
    "Marketing",
    "Social Media Marketing",
    "Email Marketing",
    "Copywriting",
    "Web Design",
    "Cryptocurrency & Web3",
    "Investing & Stocks",
    "Real Estate",
    "Insurance",
    "Banking & Credit Cards",
    "Dating & Relationships",
    "Weddings",
    "Parenting & Family",
    "Kids & Toys",
    "Baby Products",
    "DIY & Crafts",
    "Hobbies & Collectibles",
    "Art & Design",
    "News & Media",
    "Entertainment",
    "Movies & Streaming",
    "Anime & Comics",
    "Spirituality & Religion",
    "Sustainability & Eco",
    "Green Living",
    "B2B Services",
    "Freelancing",
    "E-commerce & Dropshipping",
    "Cannabis & CBD",
    "Vaping & Smoking Alternatives",
    "Language Learning",
    "University & Study Abroad",
    "Government & Legal",
    "Nonprofit & Charity",
    "Local Business",
    "Insurance & Retirement",
    "Personal Development",
    "Productivity Tools",
    "Remote Work",
    "Side Hustles"
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

window.AMZLOSS_FORM_ENDPOINT = "https://script.google.com/macros/s/AKfycbzlK33C2jegVdF06uEEGnQLBzwBPxux5ZGFkJGsNn0BsK6uD_OW3_841mAYEkNm1MmN/exec";
window.AMZLOSS_ACCESS_KEY = "";

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