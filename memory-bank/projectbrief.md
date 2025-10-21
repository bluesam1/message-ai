# MessageAI - Project Brief

## Project Overview
MessageAI is a real-time messaging application built with React Native (Expo) and Firebase. The goal is to deliver a fully functional MVP within 24 hours that demonstrates core messaging capabilities with AI enhancement potential.

## Mission Statement
Create a high-performance, offline-capable messaging platform that prioritizes user experience, reliability, and speed while maintaining a clean architecture for future AI feature integration.

## Core Objectives
1. **Real-time Communication:** Enable instant messaging between users with sub-100ms UI response times
2. **Offline-First:** Messages work offline and sync automatically when connectivity is restored
3. **Social Features:** Group chat, read receipts, and presence indicators create engaging user experience
4. **Performance Excellence:** Maintain 60 FPS scrolling with 100+ messages, < 2.5s app launch
5. **Quality Assurance:** 70%+ unit test coverage with automated pre-commit hooks
6. **Rich Media:** Support image sharing with automatic compression and optimization

## Success Criteria (Must Have)
✅ Real-time messaging between 2+ users  
✅ Messages persist across restarts and work offline  
✅ Group chat with 3+ users  
✅ Email/password + Google Sign-In authentication  
✅ Gallery image uploads  
✅ Read receipts and presence indicators  
✅ Foreground push notifications  
✅ 60 FPS performance, instant UI responses  
✅ 70%+ unit test coverage, tests run < 30s  
✅ Pre-commit hooks prevent broken code

## Timeline
**Total Duration:** 24 hours  
**Target Delivery:** MVP with all critical features functional

### Phase Breakdown
- **Hours 0-2:** Project setup and infrastructure
- **Hours 2-5:** Authentication system
- **Hours 5-10:** Core one-on-one messaging
- **Hours 10-14:** Offline support and sync
- **Hours 14-17:** Group chat
- **Hours 17-19:** Read receipts and presence
- **Hours 19-21:** Image sharing
- **Hours 21-22:** Push notifications
- **Hours 22-24:** Testing and polish

## Target Audience
**Primary Users:** Mobile users who need reliable, fast messaging with group communication capabilities

**Developer Audience:** This codebase is designed to be maintainable by junior-to-mid level developers with clear patterns and comprehensive documentation.

## Future Vision (Post-MVP)
- AI-powered message summarization
- Real-time message translation
- Intelligent action extraction from conversations
- Smart reply suggestions
- Message search and categorization

## Constraints
- **Time:** 24-hour hard deadline
- **Platform:** React Native with Expo (iOS + Android)
- **Backend:** Firebase only (no custom backend)
- **Team:** Solo development expected
- **Scope:** MVP features only, defer "nice-to-haves" ruthlessly

## Non-Goals (Explicitly Out of Scope)
- Custom UI components (use defaults)
- Complex state management (Context API sufficient)
- Background notifications (foreground only)
- Message editing or deletion
- Voice/video calls
- Message search
- Custom animations

## Project Structure
```
message-ai/
├── app/                    # Expo Router screens
├── src/                    # Core application code
│   ├── components/         # Reusable UI components
│   ├── services/           # Business logic and API calls
│   ├── utils/              # Helper functions
│   ├── hooks/              # Custom React hooks
│   ├── types/              # TypeScript definitions
│   ├── store/              # State management
│   └── config/             # Configuration files
├── __tests__/              # Unit tests (mirrors src/)
├── assets/                 # Images, fonts, etc.
├── planning/               # PRDs and documentation
│   ├── Phase 1 PRD.md      # Master PRD
│   └── supporting/         # Supporting docs
└── tasks/                  # Feature-specific PRDs
```

## Key Decision Points
- **Hour 10:** Authentication not done? Focus on core messaging
- **Hour 16:** Group chat buggy? Skip remove members
- **Hour 20:** Behind schedule? Skip camera, use gallery only
- **Hour 22:** iOS issues? Demo on Android, document problems

## Metrics for Success
- All CRITICAL features working
- Tests pass with 70%+ coverage
- Pre-commit hook configured
- Performance meets targets (60 FPS)
- Tested on Android + iOS devices
- Demo video prepared

---

**Last Updated:** October 21, 2025  
**Project Status:** Planning Complete, Implementation Not Started



