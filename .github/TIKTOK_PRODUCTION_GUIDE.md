# TikTok Production Audit Guide for AMZLOSS

## Current Status
App is in Sandbox → videos post as PRIVATE/SELF_ONLY, cannot reach For You.

## Steps to go Production

1. **App Settings in TikTok Developers**
   - Go to https://developers.tiktok.com → Your App → Settings
   - Ensure `Login Kit` and `Video Upload API` are enabled
   - Add redirect URIs:
     * `https://amzloss.com/callback.html`
     * `https://amzloss.com/auth/callback`
   - Verify `Privacy Policy URL` and `Terms of Service URL` are live on amzloss.com

2. **Submit for Review**
   - TikTok → App → Submit for Review
   - Provide:
     * App description: "AMZLOSS automated educational content about Amazon affiliate tools"
     * Screenshots of the posting flow
     * Demo video showing the content is original, not spam
     * Explain commercial disclosure: videos include on-screen "Paid promotion: AMZLOSS.COM"

3. **Required Disclosures**
   - Add `brand_content: true` in API post_info
   - Include branded hashtag `#AMZLOSS`
   - On-screen text: "Paid promotion" or "Ad"

4. **Technical Requirements**
   - Video: MP4, H.264, AAC, 1080x1920, max 60s
   - Media type: VIDEO for sandbox, PHOTO only after production audit
   - `privacy_level` can be set to `PUBLIC` after approval

5. **Timeline**
   - Review typically 3-7 business days
   - Once approved, update `TIKTOK_PRIVACY` var to `PUBLIC`

## After Approval
Update workflow env var `TIKTOK_PRIVACY` to `PUBLIC` and remove `brand_verified_status` override.
