# AI Features User Guide

MessageAI includes three AI-powered features to help you understand messages across languages and cultures:

1. **Translation** - Translate messages to your preferred language
2. **Cultural Context** - Understand cultural nuances and references
3. **Slang/Idiom Definitions** - Get explanations of unfamiliar expressions

## Overview

All AI features are:
- ✅ **Fast** - Results in < 3 seconds
- ✅ **Cached** - Instant on repeated views
- ✅ **Private** - Your messages stay secure
- ✅ **Smart** - Powered by OpenAI GPT-4o-mini

## Feature 1: Translation

### How to Use

1. Long-press any message in a conversation
2. Select **"🌐 Translate to English"** from the menu
3. Wait 1-3 seconds for the translation
4. The translated text appears below the original message

### Features

- **Toggle View**: Tap the translation to switch between original and translated text
- **Instant Cache**: Translations load instantly when you revisit
- **Preserves Tone**: Maintains the original message's style and meaning
- **Multiple Languages**: Works with 50+ languages

### Supported Languages

Spanish, French, German, Chinese, Japanese, Korean, Arabic, Portuguese, Russian, Italian, and many more!

### Example

**Original Message:**
```
"¡Hola! ¿Cómo estás? Espero que tengas un buen día."
```

**Translation (English):**
```
"Hello! How are you? I hope you have a good day."
```

**Toggle**: Tap to switch between original and translation

## Feature 2: Cultural Context Explanation

### How to Use

1. Long-press a message you want to understand better
2. Select **"💡 Explain Cultural Context"**
3. Wait 1-3 seconds
4. Read the explanation in the modal

### What It Explains

- **Cultural References**: Historical or regional context
- **Idioms**: Figurative language meanings
- **Subtext**: Implicit meanings
- **Social Context**: Formality, tone, conventions

### Example

**Message:**
```
"Break a leg at your interview!"
```

**Explanation:**
```
This is an English idiom used to wish someone good luck, especially before a 
performance or important event. The phrase originated in theater, where saying 
"good luck" was considered bad luck, so actors developed this ironic alternative. 
It's informal and friendly, showing encouragement and support.
```

### When to Use

- Unfamiliar cultural references
- Messages that seem confusing
- Learning about other cultures
- Understanding social context

## Feature 3: Slang/Idiom Definition

### How to Use

1. Long-press a message with slang or idioms
2. Select **"📖 Define Slang/Idiom"**
3. Wait 1-3 seconds
4. Read the definition in the modal

### What It Defines

- **Slang Terms**: Informal words and phrases
- **Idioms**: Common expressions
- **Colloquialisms**: Regional language
- **Internet Slang**: Acronyms and memes

### Example

**Message:**
```
"That movie was fire! 🔥"
```

**Definition:**
```
"Fire" is modern slang meaning "excellent," "amazing," or "really good." 
Commonly used to express enthusiasm or approval, especially among younger 
generations. Often paired with the fire emoji (🔥) for emphasis. 
Example: "That concert was fire!"
```

### When to Use

- Unfamiliar slang or abbreviations
- Regional expressions
- Internet/text speak
- Generational language differences

## Tips for Best Results

### 1. Context Matters

AI features work best with complete messages. Short phrases like "ok" or "lol" may not need explanation.

### 2. Use the Right Feature

- **Translation**: Different language → your language
- **Cultural Context**: Understanding deeper meaning
- **Slang Definition**: Specific word/phrase meanings

### 3. Caching Saves Time

Once translated or explained, results are cached. You can revisit anytime without waiting!

### 4. Toggle Translations

Tap on translated text to see the original. Great for learning languages!

## Limitations

### Translation

- Very long messages may be truncated
- Technical jargon may not translate accurately
- Emoji meanings may vary by culture

### Cultural Context

- Generic messages may have little context to explain
- Context is based on common knowledge
- Regional variations may differ

### Slang Definitions

- Very new slang may not be in the AI's training data
- Niche community slang may not be recognized
- Returns "Unable to explain this phrase" if unknown

## Privacy & Security

### Your Data

- Only the message text is sent to OpenAI
- No personal information is shared
- Conversations remain private
- Results are cached in your account

### OpenAI

- OpenAI processes the text to generate responses
- OpenAI does not store your messages (per their policy)
- All data is encrypted in transit

### Caching

- Translations and explanations are stored in your Firestore database
- Only you can access your cached results
- Cached data is never shared with other users

## Performance

### Response Times

- **First Request**: 1-3 seconds
- **Cached Results**: < 100ms (instant)
- **Cold Start** (rare): Up to 5 seconds

### Reliability

- **Success Rate**: > 99%
- **Caching**: Results never expire
- **Offline**: View cached results offline

## Troubleshooting

### "Translation failed"

**Causes:**
- Network connection lost
- Message too long (> 2000 characters)
- OpenAI API temporarily unavailable

**Solutions:**
- Check internet connection
- Try again in a few seconds
- Contact support if persists

### "Rate limit exceeded"

**Cause:** Too many requests in short time

**Solution:** Wait 60 seconds before trying again

### Explanation seems generic

**Cause:** Message has no special cultural context

**Solution:** Try slang definition feature instead

### Definition returns "Unable to explain"

**Cause:** AI doesn't recognize the phrase

**Solution:** Try googling the phrase or asking the sender directly

## Tips & Tricks

### Learning Languages

1. Read original message
2. Try to understand it yourself
3. Translate to check your understanding
4. Toggle back and forth to learn

### Understanding Context

1. First read the message normally
2. If confused, try Cultural Context
3. If specific words are unclear, try Slang Definition

### Saving Time

- Translations are cached forever
- Long-press is faster than typing "what does this mean?"
- Use for learning, not just understanding

## Frequently Asked Questions

### Is there a cost per translation?

No charge to users. The app handles AI costs.

### Can I translate to languages other than English?

Currently English-only. More languages coming soon!

### Will translations improve over time?

Yes! We may upgrade to more advanced models based on feedback.

### Can I disable AI features?

Currently no. Features are opt-in (long-press to activate).

### Do translations work offline?

Only if previously cached. New translations require internet.

## Future Features (Coming Soon)

- 🌍 Translate to any language (not just English)
- 🤖 Automatic translation (no long-press needed)
- 💬 AI-powered smart replies
- ✏️ Writing assistance for composing messages
- 🔍 Search messages by meaning (not just keywords)

## Feedback

We'd love to hear your thoughts!

- Translation quality
- Feature requests
- Bugs or issues
- General feedback

Contact: help@messageai.ai.co.uk

---

**Enjoy MessageAI with AI-powered communication!** 🚀

