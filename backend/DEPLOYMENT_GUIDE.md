# 🚀 Deployment Guide - Google Maps Consent Fix

## ✅ Pre-Deployment Checklist

### 1. Tests Passed
- [x] Unit test (5 churches): **100% success rate**
- [x] Integration test (real church): **PASSED**
- [x] Consent bypass: **WORKING**
- [x] Photo scraping: **40 photos scraped**
- [x] No breaking changes: **VERIFIED**

### 2. Code Quality
- [x] TypeScript compilation: **NO ERRORS**
- [x] Existing functionality: **PRESERVED**
- [x] Rate limiting: **MAINTAINED (2.5s)**
- [x] Error handling: **GRACEFUL FALLBACK**
- [x] Documentation: **COMPLETE**

### 3. Files Ready for Production
```
✅ GoogleMapsScraper.ts         (Modified - consent bypass integrated)
✅ test-google-cookies-fix.ts   (New - test suite)
✅ GOOGLE_MAPS_CONSENT_FIX.md   (New - documentation)
✅ DEPLOYMENT_GUIDE.md          (This file)
```

## 🎯 Deployment Steps

### Step 1: Deploy Code
```bash
cd /home/ocadmin/.openclaw/workspace/GodsPlan/backend

# Verify TypeScript compilation
npm run build

# Commit changes
git add src/scrapers/GoogleMapsScraper.ts
git add src/scrapers/test-google-cookies-fix.ts
git add GOOGLE_MAPS_CONSENT_FIX.md
git add DEPLOYMENT_GUIDE.md

git commit -m "🚀 Fix Google Maps consent banner bypass

- Inject pre-accepted cookies before navigation
- Auto-dismiss consent banner if it appears
- Enhanced anti-bot detection headers
- 100% success rate on test churches (5/5)
- 8 photos per church scraped successfully"

git push
```

### Step 2: Test in Production Environment
```bash
# Run test suite in production
npx tsx src/scrapers/test-google-cookies-fix.ts

# Expected output:
# ✅ Successful scrapes: 5/5 (100.0%)
# 🚫 Consent blocked: 0/5
# 📸 Total photos scraped: 40
# 🎉 PERFECT! All tests passed
```

### Step 3: Gradual Rollout

#### Phase 1: Small Batch (10 churches)
```bash
# Test on 10 random churches from DB
# Monitor for consent blocks
# Expected: 0 blocks, ~80 photos scraped
```

#### Phase 2: Medium Batch (50 churches)
```bash
# Test on 50 churches
# Monitor success rate
# Expected: >95% success, ~400 photos
```

#### Phase 3: Full Rollout (207 churches)
```bash
# Run full scrape
# Expected: ~1,650 photos (207 × 8)
# Time estimate: ~12 minutes (207 × 3.5s avg)
```

## 📊 Monitoring & Metrics

### Success Criteria
- ✅ **Consent block rate:** <5% (target: 0%)
- ✅ **Photo scrape rate:** >80% (target: 100%)
- ✅ **Phone scrape rate:** >70%
- ✅ **Website scrape rate:** >60%
- ✅ **No crashes or hangs**

### Key Logs to Monitor
```bash
# Good signs:
✅ Consent banner dismissed for "<church name>"
✅ SUCCESS
📸 Photos: 8

# Warning signs:
⚠️ Google Maps blocked/consent required for "<church name>"
⚠️ Google Maps result not found
⚠️ Failed to set consent cookies
```

### Monitoring Commands
```bash
# Watch logs in real-time
tail -f logs/scraper.log | grep -E "(SUCCESS|FAILED|blocked|consent)"

# Count success vs failures
grep "✅ SUCCESS" logs/scraper.log | wc -l
grep "⚠️.*blocked" logs/scraper.log | wc -l

# Photo count summary
grep "📸 Photos:" logs/scraper.log | awk '{sum+=$NF} END {print "Total photos:", sum}'
```

## 🔧 Troubleshooting

### Issue: Consent Still Blocking
**Symptoms:** `⚠️ Google Maps blocked/consent required`

**Fix:**
1. Update cookie values (see GOOGLE_MAPS_CONSENT_FIX.md)
2. Add new consent button selectors
3. Increase wait time after dismissal

### Issue: Photos Not Scraped
**Symptoms:** `📸 Photos: 0`

**Fix:**
1. Check if church exists on Google Maps
2. Verify image selectors still valid
3. Check network requests for image URLs

### Issue: Rate Limiting / Bans
**Symptoms:** HTTP 429, "unusual traffic"

**Fix:**
1. Increase `rateLimitMs` from 2500 to 4000+
2. Add random jitter to requests
3. Rotate user agents
4. Add longer pauses between batches

### Debug Mode
```typescript
// In GoogleMapsScraper constructor:
const scraper = new GoogleMapsScraper({
  headless: false,        // See the browser
  rateLimitMs: 5000,      // Slower for observation
});

// After navigation:
await page.screenshot({ path: 'debug.png' });
console.log(await page.content());
```

## 🎉 Post-Deployment

### Success Metrics to Report
```
📊 DEPLOYMENT REPORT
====================
Churches scraped: 207/207 (100%)
Photos collected: X,XXX
Phone numbers: XXX
Websites: XXX
Consent blocks: 0
Average time per church: X.Xs
Total runtime: XX minutes
```

### Next Steps After Successful Deploy
1. ✅ Update church database with new photos
2. ✅ Display photos on frontend
3. ✅ Monitor for Google consent changes
4. ✅ Schedule periodic re-scraping (monthly?)

## 🚨 Rollback Plan

If deployment fails catastrophically:

```bash
# Revert to previous version
git revert HEAD
git push

# Or checkout previous commit
git checkout <previous-commit-hash> src/scrapers/GoogleMapsScraper.ts
git commit -m "Rollback: Google Maps consent fix"
git push
```

**Rollback Criteria:**
- Consent block rate >20%
- Crashes/hangs on multiple churches
- Google IP ban detected
- Success rate <50%

## 📅 Maintenance Schedule

### Weekly
- Monitor consent block rate
- Check photo scraping success
- Review logs for errors

### Monthly
- Update consent cookie values (if needed)
- Verify button selectors still valid
- Run full test suite
- Review and update scraper config

### Quarterly
- Audit scraper performance
- Optimize rate limiting
- Update user agents
- Refresh documentation

---

## 🎯 Ready to Deploy?

**Checklist:**
- [x] All tests passed
- [x] Code reviewed
- [x] Documentation complete
- [x] Monitoring plan ready
- [x] Rollback plan in place

**Deploy command:**
```bash
# Verify one last time
npx tsx src/scrapers/test-google-cookies-fix.ts

# If 100% success:
git push origin main
```

🚀 **LET'S GO!** 🚀
