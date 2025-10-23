# AI Features Setup Guide

This guide explains how to set up and configure the AI-powered features in MessageAI (translation, cultural context, and slang definitions).

## Prerequisites

- Firebase project configured
- Cloud Functions enabled in Firebase
- OpenAI API account
- Node.js 18+ installed

## Step 1: Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to **API Keys** section
4. Click **Create new secret key**
5. Copy the API key (you won't be able to see it again!)
6. Store it securely

## Step 2: Configure Environment Variables

### Option A: Using Firebase Functions Environment Config (Recommended for Production)

```bash
cd functions

# Set OpenAI API key
firebase functions:config:set openai.key="your_openai_api_key_here"

# (Optional) Set a custom model (default: gpt-4o-mini)
firebase functions:config:set openai.model="gpt-4-turbo"

# View current configuration
firebase functions:config:get
```

### Option B: Using Local .env File (For Local Development)

1. Create a `.env` file in the `functions/` directory:

```bash
cd functions
touch .env
```

2. Add your OpenAI API key to `.env`:

```env
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Override default model
OPENAI_MODEL=gpt-4-turbo
```

3. **Important**: The `.env` file is gitignored and should never be committed to version control.

## Step 3: Install Dependencies

```bash
cd functions
npm install
```

This will install the OpenAI SDK and other dependencies.

## Step 4: Build Cloud Functions

```bash
cd functions
npm run build
```

This compiles the TypeScript code to JavaScript.

## Step 5: Deploy Cloud Functions

### Deploy All Functions

```bash
firebase deploy --only functions
```

### Deploy Only AI Functions (Faster)

```bash
firebase deploy --only functions:translateMessage,functions:explainContext,functions:defineSlang
```

### Deployment Output

You should see:

```
✔ functions[translateMessage] Deployed
✔ functions[explainContext] Deployed
✔ functions[defineSlang] Deployed
```

## Step 6: Verify Deployment

1. Open Firebase Console
2. Go to **Functions** section
3. Verify you see:
   - `translateMessage`
   - `explainContext`
   - `defineSlang`
   - `onPresenceChange` (existing)
   - `sendPushNotification` (existing)

## Step 7: Test AI Features

### Test Translation

```bash
cd functions
node test-ai-translation.js
```

(Create this test script or use the Firebase Functions emulator)

### Test in App

1. Build and run the app on a device/emulator
2. Send a message in another language
3. Long-press the message
4. Select "Translate to English"
5. Verify translation appears

## Configuration Options

### Models Available

- **gpt-4o-mini** (Default) - Fast and cost-effective
  - Input: $0.15 per 1M tokens
  - Output: $0.60 per 1M tokens
  - Recommended for MVP

- **gpt-4-turbo** - More capable, higher cost
  - Input: $10.00 per 1M tokens
  - Output: $30.00 per 1M tokens
  - Better for complex cultural context

- **gpt-4** - Most capable, highest cost
  - Input: $30.00 per 1M tokens
  - Output: $60.00 per 1M tokens
  - Best quality, slowest

- **gpt-3.5-turbo** - Fastest, lowest cost
  - Input: $0.50 per 1M tokens
  - Output: $1.50 per 1M tokens
  - Good for simple translations

### Override Model

To switch models without redeploying:

```bash
firebase functions:config:set openai.model="gpt-4-turbo"
```

Then restart your functions (they will pick up the new config on cold start).

### Rate Limiting

The default rate limit is **10 requests per minute per user**. To change this:

1. Edit `functions/src/utils/rateLimiter.ts`
2. Modify `MAX_REQUESTS_PER_WINDOW` and `RATE_LIMIT_WINDOW_MS`
3. Rebuild and redeploy

```typescript
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20; // 20 requests per minute
```

### Cost Monitoring

AI usage is automatically logged to Firestore `aiUsage` collection.

**View usage in Firebase Console:**

1. Go to **Firestore Database**
2. Open `aiUsage` collection
3. View token counts, costs, and timestamps

**Query total cost:**

```javascript
const snapshot = await db.collection('aiUsage')
  .where('timestamp', '>=', Date.now() - 30 * 24 * 60 * 60 * 1000)
  .get();

let totalCost = 0;
snapshot.forEach(doc => {
  totalCost += doc.data().cost;
});

console.log(`Total cost (30 days): $${totalCost.toFixed(4)}`);
```

## Troubleshooting

### "OPENAI_API_KEY environment variable is not set"

**Cause**: API key not configured

**Solution**:
```bash
firebase functions:config:set openai.key="your_key_here"
```

### "Rate limit exceeded"

**Cause**: User exceeded 10 requests per minute

**Solution**: Wait 60 seconds or increase rate limit (see Configuration above)

### "OpenAI API quota exceeded"

**Cause**: OpenAI account has no credits or exceeded quota

**Solution**:
1. Go to [OpenAI Billing](https://platform.openai.com/account/billing)
2. Add payment method
3. Purchase credits

### Translation returns empty or error

**Cause**: Model may be overloaded or input too long

**Solution**:
- Check message is under 2000 characters
- Try again in a few seconds
- Check Cloud Functions logs: `firebase functions:log`

### High costs

**Cause**: Using expensive model or high volume

**Solution**:
- Switch to `gpt-4o-mini` (most cost-effective)
- Enable more aggressive caching
- Reduce message length limits
- Add per-user cost limits

## Security Best Practices

1. **Never commit API keys**
   - Use environment variables or Firebase config
   - Keep `.env` in `.gitignore`

2. **Enable rate limiting**
   - Prevents abuse
   - Default: 10 requests/min/user

3. **Monitor costs**
   - Set up billing alerts in OpenAI dashboard
   - Review `aiUsage` collection regularly

4. **Firestore security rules**
   - Only authenticated users can call functions
   - Users can only read their own usage data

## Next Steps

- See [AI_FEATURES.md](./AI_FEATURES.md) for user guide
- Monitor costs in OpenAI dashboard
- Adjust models based on quality/cost tradeoff
- Consider implementing user-level cost limits

## Support

For issues:
1. Check Cloud Functions logs: `firebase functions:log`
2. Check OpenAI API status: https://status.openai.com/
3. Review Firestore `aiUsage` collection for errors

