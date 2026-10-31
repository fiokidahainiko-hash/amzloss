/* AmzLoss — local smoke test for Facebook + Instagram posting.
   Usage (PowerShell):
     $env:FACEBOOK_ACCESS_TOKEN="..."; $env:FACEBOOK_PAGE_ID="..."
     $env:INSTAGRAM_ACCESS_TOKEN="..."; $env:INSTAGRAM_USER_ID="..."
     node .github/test-facebook-instagram.mjs
   It posts one image (SVG card) + caption to whichever platform has secrets set.
*/
import { generateImage, sendFacebook, sendInstagram } from "./lib-social.mjs";

async function main() {
  const img = await generateImage(
    "test-social",
    "✅ Test post from AmzLoss",
    "Facebook + Instagram sender smoke test — amzloss.com"
  );
  console.log("Image ready:", img.url);

  const tasks = [sendFacebook({ text: "Test post from the AmzLoss bot. Free Amazon affiliate tools at amzloss.com", imgUrl: img.url })];
  if (process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_USER_ID) {
    tasks.push(sendInstagram({ text: "Test post from the AmzLoss bot. Free Amazon affiliate tools at amzloss.com", imgUrl: img.url }));
  }

  const results = await Promise.all(tasks);
  for (const r of results) {
    console.log(`SOCIAL_${r.name.toUpperCase()}=${r.status}`);
  }
  console.log("DONE (check your Facebook Page / Instagram for the test post)");
}

main().catch((e) => {
  console.error("ERROR:", e.message || e);
  process.exit(1);
});