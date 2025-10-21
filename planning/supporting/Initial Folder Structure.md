messageai/                      # Root project directory
├── functions/                  # Firebase Functions (backend)
│   ├── src/
│   │   ├── ai/                # AI-related functions
│   │   │   ├── summarize.ts
│   │   │   ├── translate.ts
│   │   │   └── agents/
│   │   ├── messaging/         # Message-related functions
│   │   └── notifications/     # Push notification triggers
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
├── src/                       # React Native app code
│   ├── components/
│   │   ├── ui/               # Reusable UI components
│   │   └── chat/             # Chat-specific components
│   ├── services/             # Client-side services
│   │   ├── firebase/         # Firebase client services
│   │   ├── sqlite/           # SQLite services
│   │   ├── messaging/        # Message handling
│   │   └── ai/               # AI client integration
│   ├── utils/                # Helper functions
│   ├── hooks/                # Custom hooks
│   ├── types/                # TypeScript types (shared types)
│   ├── store/                # State management
│   ├── config/               # App configuration
│   │   └── firebase.ts
│   └── __tests__/            # Unit tests mirror src/
│
├── app/                      # Expo Router screens
│   ├── (auth)/              # Auth screens
│   ├── (tabs)/              # Main app tabs
│   ├── chat/[id].tsx        # Dynamic chat screen
│   └── _layout.tsx          # Root layout
│
├── assets/
│   ├── images/
│   └── fonts/
│
├── shared/                   # Shared between app and functions
│   └── types/               # Type definitions used by both
│
└── scripts/                 # Deployment and utility scripts
    ├── deploy-functions.sh
    └── setup-firebase.sh
```

## Key Improvements

**1. Dedicated `functions/` Directory**
- Keeps backend code completely separate from mobile app
- Has its own `package.json` and dependencies
- Can be deployed independently
- Organized by feature (ai, messaging, notifications)

**2. `shared/` Directory**
- Types and interfaces used by both the mobile app and Cloud Functions
- Prevents duplication and keeps types in sync
- Example: `Message`, `Conversation`, `User` types

**3. Better Services Organization**
- Group related services in subdirectories
- `services/firebase/` contains all Firebase client-side code
- `services/ai/` contains AI integration client code

**4. `config/` Directory**
- Centralizes configuration files
- Makes it clear where to find Firebase setup

**5. `scripts/` Directory**
- Deployment scripts
- Setup scripts for Firebase, environment variables, etc.

## Why This Matters for Your Project

Given the PRD requirements for AI features (summarization, translation, action extraction), you'll likely have:
- Multiple Cloud Functions handling different AI tasks
- Shared type definitions between client and server
- API calls from the mobile app to these functions

This structure makes it much cleaner to:
- Deploy functions independently (`firebase deploy --only functions`)
- Share types without duplication
- Test functions separately from the mobile app
- Add new AI capabilities without cluttering the mobile codebase
