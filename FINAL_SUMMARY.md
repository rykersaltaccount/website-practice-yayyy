# CodeVault Course Generator Hanging Issue - Fix Summary

## Problem
The course generator was getting stuck indefinitely at "Sending request to meta/llama-3.3-70b-instruct..." with occasional "Failed to fetch" errors. This prevented users from generating course content.

## Root Causes Found and Fixed

### 1. Primary Issue: Vercel AI Function Response Handling (File: `api/ai.mjs`)
**Problem:** The Vercel function was using non-existent Node.js ServerResponse methods:
- `response.send()` - does not exist on ServerResponse
- `response.status().json()` - does not exist on ServerResponse

These method calls threw TypeError exceptions, which were caught but then the error handler also tried to use the same non-existent methods, resulting in **no HTTP response ever being sent** to the client. This caused the browser's fetch request to hang indefinitely.

**Fix:** Replaced incorrect methods with proper Node.js HTTP response handling:
- `response.status(405).json({error})` → `response.statusCode = 405; response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify({error}))`
- `response.send(text)` → `response.end(text)`
- `response.status(502).json({error})` → `response.statusCode = 502; response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify({error}))`

### 2. Secondary Issue: Timeout Values (Files: `api/ai.mjs`, `server/compile-server.mjs`)
**Problem:** Hardcoded 30-second timeouts in proxies were too slow for NVIDIA NIM responses, especially for larger models like meta/llama-3.3-70b-instruct.

**Fix:** Increased all AI request timeouts from 30 seconds to 90 seconds:
- In `api/ai.mjs`: `AbortSignal.timeout(90000)`
- In `server/compile-server.mjs`: `AbortSignal.timeout(90000)`

### 3. Tertiary Issue: Misleading Error Messages (File: `src/utils/aiProviders.ts`)
**Problem:** Error message in `requestJson` function said "timed out after 30 seconds" when the actual browser-side timeout was 120 seconds.

**Fix:** Updated error message to accurately reflect the 120-second timeout:
- Changed: `'The AI request timed out after 30 seconds...'`
- To: `'The AI request timed out after 120 seconds or the CodeVault AI proxy is unavailable...'`

## Verification
1. ✅ All files now pass syntax checks: `node -c *.mjs` and `node -c *.ts`
2. ✅ Proxy servers properly handle and forward HTTP responses (success and error cases)
3. ✅ Timeout values now consistent and appropriate for AI model response times
4. ✅ Error messages accurately reflect actual timeout values
5. ✅ No direct browser-to-NVIDIA calls found - all requests properly go through /api/ai proxy
6. ✅ UI loading states properly cleared via finally blocks in CourseRunnerPage.tsx
7. ✅ Support preserved for all providers: NIM, Ollama, ChatGPT, Gemini, Grok, Custom

## Files Modified
1. `api/ai.mjs` - Fixed response handling and increased timeout
2. `server/compile-server.mjs` - Increased timeout for proxy requests
3. `src/utils/aiProviders.ts` - Corrected error message timeout value

## Behavior After Fix
- Instead of hanging indefinitely at "Sending request to...", the UI now:
  - Shows appropriate error messages for timeouts, authentication failures, etc.
  - Properly exits loading states via finally blocks
  - Allows users to retry after failures
  - Displays distinct UI states for different error types (401, 404, 429, timeout, malformed JSON)
- Successful AI responses are processed and displayed normally
- The course generation modal no longer remains locked forever

## Note on API Keys
During investigation, it was noted that `courseModels` in `aiProviders.ts` have empty `apiKey: ''` values. This would cause authentication failures with NVIDIA NIM but was masked by the primary hanging issue. Users should configure their API keys through the AI settings UI for proper functionality.

The fix ensures that when API keys are properly configured, requests will work correctly instead of hanging.