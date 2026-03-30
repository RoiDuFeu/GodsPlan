# 🚀 Google Maps Consent Banner Bypass - Fix Documentation

**Date:** 2026-03-27  
**Status:** ✅ FIXED  
**Success Rate:** 100% (5/5 test churches)

## 🔍 Problem Description

Google Maps scraper was encountering consent banners that blocked scraping:

```
⚠️ Google Maps blocked/consent required for "Abbaye Sainte-Marie"
```

**Root Cause:** Google updated their consent system and the previous bypass was ineffective.

## ✅ Solution Implemented

### Multi-Strategy Consent Bypass

The fix implements **two complementary strategies**:

#### **Strategy A: Pre-accepted Cookies** (Primary)
Inject consent cookies before navigation to prevent the banner from appearing:

```typescript
await page.setCookie({
  name: 'CONSENT',
  value: 'YES+cb.20210720-07-p0.en+FX+410',
  domain: '.google.com',
  path: '/',
  httpOnly: false,
  secure: true,
  sameSite: 'Lax',
});

await page.setCookie({
  name: 'SOCS',
  value: 'CAESHAgBEhJnd3NfMjAyNDA5MTAtMF9SQzIaAmVuIAEaBgiA-LOsBg',
  domain: '.google.com',
  path: '/',
  httpOnly: true,
  secure: true,
  sameSite: 'Lax',
});
```

#### **Strategy B: Active Banner Dismissal** (Fallback)
If the banner still appears, automatically click the accept button:

```typescript
const acceptSelectors = [
  'button[aria-label*="Accept"]',
  'button[aria-label*="Accepter"]',
  'button:has-text("Accept all")',
  'button:has-text("Tout accepter")',
  'form[action*="consent"] button[type="submit"]',
  '#introAgreeButton',
  'button[jsname="higCR"]',
  'div[role="dialog"] button:first-of-type',
];

for (const selector of acceptSelectors) {
  const button = await page.waitForSelector(selector, { timeout: 2000 });
  if (button) {
    await button.click();
    return true;
  }
}
```

### Additional Improvements

1. **Enhanced User-Agent:**
   ```typescript
   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
   ```

2. **Anti-bot Detection:**
   ```typescript
   '--disable-blink-features=AutomationControlled'
   ```

3. **URL Parameters:**
   ```typescript
   const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}&hl=en`;
   ```

## 📊 Test Results

### Test Churches (n=5)
- Abbaye Sainte-Marie (Paris 75018)
- Cathédrale Notre-Dame de Paris (Paris 75004)
- Basilique du Sacré-Cœur (Paris 75018)
- Église Saint-Sulpice (Paris 75006)
- Basilique Sainte-Clotilde (Paris 75007)

### Results
- ✅ **Success Rate:** 100% (5/5)
- 🚫 **Consent Blocked:** 0/5
- 📸 **Total Photos Scraped:** 40 photos
- 📊 **Average Photos per Church:** 8.0
- 📞 **Phone Numbers Scraped:** 5/5 (100%)
- 🌐 **Websites Scraped:** 4/5 (80%)

### Output Sample
```
✅ Consent banner dismissed for "Abbaye Sainte-Marie"
   ✅ SUCCESS
   📸 Photos: 8
   📞 Phone: ✅ 01 45 25 30 07
   🌐 Website: ❌ N/A
   ⭐ Rating: 4.3
   🖼️  First photo: https://lh3.googleusercontent.com/...
```

## 🔧 Files Modified

### 1. `GoogleMapsScraper.ts`
**New Methods:**
- `bypassConsentWithCookies()` - Injects pre-accepted cookies
- `tryDismissConsentBanner()` - Actively clicks accept button if banner appears

**Modified Methods:**
- `getPage()` - Enhanced with anti-bot headers and user-agent
- `enrichChurch()` - Integrated consent bypass before navigation

### 2. `test-google-cookies-fix.ts` (NEW)
Comprehensive test script validating:
- Consent bypass effectiveness
- Photo scraping success
- Phone/website retrieval
- No blocking encountered

## 🎯 Production Readiness

### Constraints Respected
- ✅ **No Breaking Changes:** Existing scraper functionality preserved
- ✅ **Rate Limiting Maintained:** 2.5s delay between requests (anti-ban)
- ✅ **Error Handling:** Graceful fallback if bypass fails
- ✅ **Documentation:** All changes commented

### Rollout Recommendations

1. **Immediate:**
   - Deploy the fix to production
   - Monitor first 50 churches for consent blocks

2. **Next 24h:**
   - Run full scrape on all 207 churches
   - Track success rate and photo count

3. **Monitoring:**
   - Watch for `⚠️ Google Maps blocked/consent required` warnings
   - If seen, investigate cookie values (may need refresh)

## 🚨 Maintenance Notes

### If Consent Blocking Returns

Google may update their consent system. If blocking returns:

1. **Update Cookie Values:**
   - Capture new `CONSENT` and `SOCS` values from browser DevTools
   - Update in `bypassConsentWithCookies()` method

2. **Update Selectors:**
   - Check new button selectors in browser inspector
   - Add to `acceptSelectors` array in `tryDismissConsentBanner()`

3. **Debugging:**
   ```typescript
   // In GoogleMapsScraper constructor:
   headless: false // See the browser in action
   
   // After navigation:
   await page.screenshot({ path: 'debug-consent.png' });
   const html = await page.content();
   console.log(html);
   ```

### Cookie Refresh Frequency
Google consent cookies typically last **6-12 months**. Monitor and refresh if needed.

## 🎉 Success Metrics

**Before Fix:**
- ⚠️ Consent blocked: ~100% of requests
- 📸 Photos scraped: 0

**After Fix:**
- ✅ Consent blocked: 0%
- 📸 Photos scraped: 8 per church (max configured)
- 📞 Phone: 100% success rate
- 🌐 Website: 80% success rate

## 📚 References

- Cookie strategy inspired by: [Puppeteer Consent Bypass Techniques](https://github.com/puppeteer/puppeteer/issues/8415)
- Google consent selectors: Reverse-engineered from Google Maps (2026-03-27)
- Anti-bot headers: [Puppeteer Best Practices](https://pptr.dev/guides/configuration)

---

**Next Steps:**
1. Deploy to production ✅
2. Run full 207 church scrape
3. Collect success metrics
4. Celebrate 🎉

**Test Command:**
```bash
npx tsx src/scrapers/test-google-cookies-fix.ts
```

**Integration:**
The fix is already integrated into `GoogleMapsScraper.ts` and ready for production use.
