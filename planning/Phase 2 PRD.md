# MessageAI – Phase 2 PRD (International Communicator Persona)

This document outlines enhancements to the existing real-time messaging app, focusing on adding **AI-driven communication tools** that help users chat smoothly across languages and cultures.

**Timeline:** 2 days (48 hours)
**Platform:** React Native (Expo)
**Backend:** Firebase + Cloud Functions + OpenAI API

---

## 🎯 Objective

Combine the purpose and outcome into a single, concise statement for clarity:

This phase expands the real-time messaging app with **AI-driven translation and communication features** that help international users chat naturally across languages. It implements core translation, understanding, and automation workflows that demonstrate rubric-compliant AI performance, while laying the groundwork for future enhancements such as performance optimization, message reactions, and background notifications.

Additionally, this PRD should serve as a foundation for future development phases that will evolve beyond Phase 2 — including performance optimization, richer chat experiences (message reactions, background notifications), and ongoing refinement of AI capabilities.

---

## ✅ Success Criteria 

| Category                 | Goal                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| **Required AI Features** | All 5 International Communicator features implemented and functional                       |
| **Advanced Capability**  | Proactive Auto-Translate Orchestrator + Context-Aware Smart Replies v2                     |
| **Architecture**         | Firebase Cloud Functions integrate securely with OpenAI using multi-step context workflows |
| **Performance**          | AI responses <3s, smooth UI integration                                                    |
| **Deployment**           | Working on Expo Go or device                                                               |
| **Documentation**        | Updated README + Persona Brainlift summary                                                 |
| **Demo**                 | 5-min video showing translation, orchestration, and smart replies in action                |

---

## 🧠 Persona: International Communicator

### Who They Are

Users chatting with people in other languages (friends, family, global coworkers).

### Pain Points

* Can’t understand messages in unfamiliar languages.
* Unsure how formal or casual their tone sounds.
* Struggle with slang and idioms.
* Switching between translation apps slows conversations.

### Solution

Add lightweight, inline AI tools for translation, tone adjustment, and cultural hints — built directly into the chat interface — combined with multi-step, context-aware automation for proactive translation and smart replies.

---

## 💡 Phase 2 Scope

### Realtime Translation (n8n)

**Goal:** Implement near real-time message translation through n8n orchestration, providing a seamless multilingual chat experience.

**Requirements (High-Level):**

* Incoming messages should automatically trigger a translation flow when auto-translate is enabled.
* During translation, a spinner or loading indicator displays in the message bubble.
* Once complete, the translated message replaces the original temporarily, with a toggle (e.g., tap) allowing the user to view the original message.
* Translation results and source language should be cached in Firestore for performance and consistency.
* Users should have a clear, consistent interaction model: **Tap to toggle original/translation** and **Long press for translation options**.
* Handle failed or delayed translations gracefully by showing the original message and a “Try again” option.

**User Experience Outcome:** Conversations appear fluid, with minimal delay between message receipt and translation, providing transparency and control over viewing the original or translated text.

---

To improve readability and logical flow, the advanced AI capabilities can be placed directly after the Required AI Features section so that the document progresses from simple foundational features to complex multi-step workflows.

### Required AI Features (5 Total)

| # | Feature                                 | Implementation                                                                | Complexity             |
| - | --------------------------------------- | ----------------------------------------------------------------------------- | ---------------------- |
| 1 | **Inline Translation**                  | Long-press → “Translate” → Cloud Function → GPT translation → display inline. | ⭐ Simple               |
| 2 | **Language Detection & Auto-Translate** | Detect message language, auto-translate if different from user’s default.     | ⭐ Simple               |
| 3 | **Cultural Context Hint**               | Button → “Explain” → GPT gives short cultural/contextual note.                | ⭐ Simple               |
| 4 | **Formality Adjustment**                | In composer → “Rephrase (Formal/Informal)” → GPT rewrites tone.               | ⭐⭐ Slightly more logic |
| 5 | **Slang/Idiom Explanation**             | Button → “What does this mean?” → GPT defines slang.                          | ⭐ Simple               |

**Rubric Alignment:** Covers *Required AI Features (15 pts)* for the International Communicator persona.

---

### Advanced AI Capabilities

#### 1️⃣ Proactive Auto-Translate Orchestrator

**Goal:** Enable the app to autonomously detect, decide, translate, and remember translation preferences for each chat thread.

**Multi-Step Flow:**

1. **Detect:** Identify incoming message language.
2. **Lookup:** Retrieve per-thread user preferences `{ targetLang, autoTranslate, defaultTone }`.
3. **Decide:** If `autoTranslate=true` and `lang!=targetLang`, automatically translate.
4. **Persist:** Save `{ detectedLang, translatedText }` in Firestore message metadata.
5. **Learn:** If the user taps “Always translate to X,” update `conversation.aiPrefs`.
6. **Feedback:** Users can rate translations → used for model tuning.

**Endpoint:** `/ai/processIncomingMessage`
**Firestore Schema Additions:**

* `conversations/{id}.aiPrefs = { targetLang, autoTranslate, defaultTone }`
* `messages/{id}.aiMeta = { detectedLang, translatedText, feedback? }`

✅ Demonstrates orchestration, context retention, and user preference learning.

---

#### 2️⃣ Context-Aware Smart Replies v2

**Goal:** Provide quick, relevant AI-generated replies that understand tone, language, and conversation context.

**Multi-Step Flow:**

1. **Retrieve:** Pull the last 5–10 messages from Firestore.
2. **Infer:** Determine the conversation language and tone from `aiPrefs`.
3. **Generate:** Ask GPT to produce 3 relevant replies using consistent tone and language.
4. **Filter:** Post-process results (limit length, remove sensitive info).
5. **Return:** Send structured JSON `{ replies: [a, b, c] }` to the client.

**Endpoint:** `/ai/generateSmartReplies`
**Firestore Schema Additions:**

* `conversations/{id}.aiPrefs.lastReplyStyle`
* `messages/{id}.aiMeta.replies[]`

✅ Multi-step, context-aware workflow; satisfies *Advanced Capability (9–10 pts)* criteria.

---

## ⚙️ Technical Design

### Frontend (Expo)

* Long-press or message toolbar → menu options:

  * Translate
  * Explain (Cultural Hint / Slang)
  * Smart Reply
* Auto-translate toggle and preference chip: “Always translate to {language}”
* Spinner during LLM response; cached AI metadata reused for instant reloads.

### Backend (Firebase Cloud Functions)

* `/translateMessage`: Handles on-demand translations, explanations, and tone adjustments.
* `/ai/processIncomingMessage`: Executes proactive auto-translate orchestration.
* `/ai/generateSmartReplies`: Retrieves context, generates multi-step replies.
* API keys in `process.env.OPENAI_API_KEY`; includes rate limiting and error handling.

### AI Configuration

* Model: `gpt-4o-mini` or `gpt-4-turbo`
* Temperature: `0.3`
* Token limit: 500
* JSON-formatted outputs for structured responses.

---

## 🔐 Security & Performance

* All LLM calls routed through Cloud Functions (no keys in app).
* Cache results locally to reduce cost and latency.
* Limit AI requests to <500 tokens.
* Response time goal: <3 seconds.
* Auto-translate preference stored securely per conversation.

---

## 🧩 User Stories

**Translation**

* US-017: As a user, I can long-press a message and select “Translate” to read it in my preferred language.
* US-018: As a user, I want messages in other languages to auto-translate automatically.
* US-019: As a user, I can set “Always auto-translate to X” for each chat thread.

**Cultural Understanding**

* US-020: As a user, I can tap “Explain” to get cultural or slang context for a message.

**Tone Control**

* US-021: As a user, I can rephrase my outgoing message to be more formal or casual.

**Smart Replies (Advanced)**

* US-022: As a user, I can generate 3 quick AI replies that match my tone and language.
* US-023: As a user, I want replies to reflect the context of the last few messages.

---

## 📈 Performance Targets

| Metric                | Target     | Max    |
| --------------------- | ---------- | ------ |
| AI Response Time      | <3s        | 5s     |
| Translation Accuracy  | 90%+       | 80%    |
| Smart Reply Relevance | 80% useful | 70%    |
| FPS                   | 60 FPS     | 55 FPS |
| App Launch            | <2s        | 3s     |

---

## 🗓️ 2-Day Implementation Plan

| Time          | Focus                                            | Deliverables                                                             |
| ------------- | ------------------------------------------------ | ------------------------------------------------------------------------ |
| **Day 1 AM**  | Setup Cloud Functions + OpenAI integration       | ✅ Working `/translateMessage` and `/ai/processIncomingMessage` endpoints |
| **Day 1 PM**  | Inline Translation + Auto-Translate Orchestrator | ✅ Functional auto-translate with preferences                             |
| **Day 1 Eve** | Cultural Hint + Slang Explanation                | ✅ Message options complete                                               |
| **Day 2 AM**  | Formality Rephrase + Smart Replies v2            | ✅ Chat composer + contextual reply UI done                               |
| **Day 2 PM**  | Polish, Testing, and Video                       | ✅ 5 features demo-ready                                                  |

---

## 🌐 n8n Integration

### Why Use n8n

n8n provides low-code orchestration for multi-step workflows, ideal for the **Proactive Auto-Translate Orchestrator** and **Context-Aware Smart Replies v2**. It handles branching, retries, and monitoring while Cloud Functions remain lightweight.

### 🔁 Proactive Auto-Translate Orchestrator Flow

**Trigger:** Firestore write → Cloud Function → n8n Webhook.

**Node Sequence:**

1. **Webhook (POST /auto-translate)** – Receives payload from Cloud Function.
2. **Set Node** – Normalize message data.
3. **HTTP Request** – Fetch `aiPrefs` from Firestore REST API.
4. **OpenAI Node** – Detect message language.
5. **IF Node** – Compare detected vs. preferred language.

   * **True:** Translate → update Firestore with translation → optional chip message.
   * **False:** Update Firestore with detected language only.
6. **Error Handling Node** – Capture, log, and retry failures.

### 💬 Context-Aware Smart Replies Flow

**Trigger:** Client action (Smart Reply) → Cloud Function → n8n Webhook.

**Node Sequence:** Retrieve last 5–10 messages → Infer tone/language → Generate replies → Filter → Return JSON → Update Firestore preferences.

### ⚙️ Security & Ops

* Use n8n **Credentials** for OpenAI and Firestore.
* Validate Webhook requests with HMAC headers.
* Deploy n8n with HTTPS + IP allowlist.
* Configure retry policies and error logging.

---

## 💬 Core Messaging & UX Quality Features

* **Typing Indicators**: Real-time feedback for active typing.
* **Auto-Focus Input**: Cursor returns to message box after sending.
* **Delivery/Read Receipts**: Icons for sent, delivered, and read.
* **Timestamps**: Human-readable times below each message.
* **Keyboard Handling**: Smooth transitions; prevent jumps when typing.
* **Avatars**: Profile pictures in bubbles and thread headers.
* **Scrolling Optimization**: 60 FPS auto-scroll for new messages.
* **Thread Language Selector**: Choose a preferred translation language per chat.
* **AI Toolbar**: Buttons for Translate, Explain, Rephrase, and Smart Reply.
* **Message Reactions**: Long-press to add emoji reactions (👍❤️😂 etc.) with real-time sync.

### Theme Polish (Prioritization)

**Easy / Must-Implement:** Rounded message bubbles, consistent margins, and placeholder animations for image or message loading.
**Moderate / Stretch Goals:** Light/dark mode toggle, full adaptive themes, and dynamic color matching based on user preferences.

These stretch goals are visually impactful but more complex to implement; prioritize the easy items within this phase for guaranteed UX gains.

Message reactions are now a **must-have feature** for Phase 2 to improve user engagement, create parity with modern chat apps, and strengthen the Mobile App Quality score under visual polish and interactivity.

---

## 🔒 User and Thread Management

To enhance usability and moderation within the app, include basic account and conversation controls:

### Leaving or Deleting Chats

* **Leave Group Chat:** When a user leaves, remove them from the `participants[]` array in Firestore. Notify remaining participants via system message (e.g., "Alex left the chat").
* **Delete Conversation:**

  * **For one-on-one chats:** Mark the thread as `archived` or `hidden` for the user who deletes it. The conversation remains visible for the other user until they also delete it.
  * **For group chats:** If the last participant leaves, delete the conversation document entirely.
* **Soft Delete Strategy:** Instead of permanently removing messages, set a flag (`isDeleted: true`) for each message or thread. This preserves integrity for sync and analytics while hiding it from the user’s UI.

### Blocking Users

* Add a `blockedUsers[]` array in the user document. Prevent messages from blocked users from appearing in Firestore listeners.
* When a user is blocked, hide their online status and prevent new message notifications.

### Related Firestore Structure Updates

```
users/{userId}
  blockedUsers: [userIds]
conversations/{conversationId}
  participants: [userIds]
  hiddenFor: [userIds]
messages/{messageId}
  isDeleted: boolean
```

These features improve safety, privacy, and user control while maintaining message integrity and avoiding data inconsistency.

---

## 🚀 Performance Enhancements & Benchmarks

To ensure smooth user experience and meet the *Mobile App Quality* rubric standards, the following benchmarks and optimizations should be tracked and verified:

### Performance Goals & Benchmarks

* **Message Send (UI Feedback):** < 100ms (target) / 150ms (max)
* **Open Conversation:** < 200ms (target) / 300ms (max)
* **Screen Navigation:** < 200ms (target) / 300ms (max)
* **Scrolling Performance:** Maintain 60 FPS (target) / 55 FPS (minimum)
* **App Launch:** < 1.5s (target) / 2.5s (max)
* **AI Response (Translate, Smart Replies):** < 3s (target) / 5s (max)
* **Offline Sync:** Full message history restored < 1s after reconnect (target) / 2s (max)

Performance verification should be completed before demo submission and validated through manual and automated profiling on both Android and iOS devices.

---

## 🧠 Summary

> **MessageAI Phase 2** evolves into a contextually intelligent, multilingual chat assistant.
> With proactive translation and smart replies, conversations flow seamlessly across languages — faster, clearer, and more natural.

**Focus:** Smart → Context-Aware → Reliable → Scalable.
This document now supports Phase 2 execution and sets direction for multi-phase development beyond this sprint.
