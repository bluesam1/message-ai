# Active Context

## Current Status
**Phase:** Planning Complete, Ready for Implementation  
**Date:** October 21, 2025  
**Branch:** main (no commits yet)

## What Just Happened

### ✅ Completed
1. **Master PRD Created:** Phase 1 PRD documents all MVP requirements
2. **Feature Breakdown:** Split Phase 1 into 8 detailed feature PRDs
3. **Project Structure:** Defined folder structure for Expo + Firebase app
4. **Timeline Established:** 24-hour development schedule mapped out
5. **Memory Bank Initialized:** Core documentation structure created

### 📋 Feature PRDs Created
All PRDs are in `/tasks` directory:

1. **PRD 01 - Project Setup & Infrastructure** (Hours 0-2)
2. **PRD 02 - Authentication System** (Hours 2-5)
3. **PRD 03 - Core One-on-One Messaging** (Hours 5-10)
4. **PRD 04 - Offline Support & Sync** (Hours 10-14)
5. **PRD 05 - Group Chat** (Hours 14-17)
6. **PRD 06 - Read Receipts & Presence** (Hours 17-19)
7. **PRD 07 - Image Sharing** (Hours 19-21)
8. **PRD 08 - Push Notifications (Foreground)** (Hours 21-22)

## Current Focus

### Immediate Next Steps
**PRIORITY:** Begin implementation with PRD 01 (Project Setup & Infrastructure)

#### PRD 01 Checklist (Before Any Coding)
- [ ] Create Firebase project at console.firebase.google.com
- [ ] Enable Authentication (Email/Password + Google)
- [ ] Create Firestore database (test mode)
- [ ] Set up Firebase Storage (test mode)
- [ ] Configure FCM (download config files)
- [ ] Create Google OAuth client IDs (iOS + Android)
- [ ] Set up .env file with Firebase credentials

#### Then Code Setup
- [ ] Initialize Expo project with TypeScript
- [ ] Install all dependencies (see PRD 01)
- [ ] Configure Expo Router
- [ ] Set up Jest + pre-commit hooks
- [ ] Create folder structure
- [ ] Verify app launches on both platforms

## Active Decisions

### Technology Choices (Confirmed)
- **Frontend:** React Native with Expo SDK 50.x
- **Routing:** Expo Router v3.x
- **Backend:** Firebase (Auth, Firestore, Storage, FCM)
- **Local DB:** Expo SQLite v13.x
- **State:** Context API (keeping it simple, no Zustand unless needed)
- **Testing:** Jest + @testing-library/react-native
- **TypeScript:** v5.x

### Architecture Patterns (Confirmed)
- **Optimistic UI:** Show changes immediately, sync in background
- **Cache-First:** Load from SQLite, update from Firestore
- **Service Layer:** Separate business logic from UI
- **Component Structure:** Smart containers, dumb presentational components

### Performance Targets (Non-Negotiable)
| Action | Target | Maximum |
|--------|--------|---------|
| Message send (UI) | < 50ms | 100ms |
| Open conversation | < 100ms | 200ms |
| Screen navigation | < 200ms | 300ms |
| FPS (scrolling) | 60 FPS | 55 FPS |
| App launch | < 1.5s | 2.5s |

**Rule:** If we exceed maximum times, STOP and optimize before continuing.

## Known Challenges & Mitigations

### 1. Google OAuth Setup (High Risk)
**Challenge:** OAuth configuration is notoriously tricky, can take 60+ minutes  
**Mitigation:** Budget full hour, follow Firebase docs exactly, test early

### 2. iOS Build on Windows
**Challenge:** Can't build iOS locally on Windows machine  
**Mitigation:** Use EAS Build cloud service for iOS builds

### 3. Offline Sync Complexity
**Challenge:** Offline queue and sync can get complex quickly  
**Mitigation:** Start with simple implementation, iterate only if needed

### 4. 24-Hour Timeline
**Challenge:** Aggressive timeline with many features  
**Mitigation:** 
- Skip ALL optional features if behind schedule
- Decision points at hours 10, 16, 20, 22
- Focus on CRITICAL features only

## Dependencies & Blockers

### Current Blockers
**NONE** - Ready to start implementation

### Dependency Chain
```
PRD 01 (Setup) 
    ↓
PRD 02 (Auth) 
    ↓
PRD 03 (Core Messaging) ←─┐
    ↓                      │
PRD 04 (Offline) ──────────┤
    ↓                      │
PRD 05 (Groups) ───────────┤
    ↓                      │
PRD 06 (Read Receipts) ────┤  ← Can develop in parallel
PRD 07 (Images) ───────────┤  ← Can develop in parallel
PRD 08 (Notifications) ────┘  ← Can develop in parallel
```

## Recent Insights

### From PRD Analysis
1. **Test Coverage Focus:** Focus tests on utils and business logic, skip UI/Firebase tests
2. **Performance Budget:** FlatList optimizations are critical for 60 FPS goal
3. **Scope Management:** Many "optional" features identified - defer aggressively
4. **Error Handling:** Every feature PRD includes detailed error scenarios

### From Planning Phase
1. **Feature Cohesion:** Features build naturally on each other
2. **Clear Boundaries:** Each PRD is self-contained with clear interfaces
3. **Testing Strategy:** Unit tests for logic, manual tests for integration
4. **Documentation Quality:** PRDs are detailed enough for junior developers

## Working Notes

### Firebase Setup Prep
Need to gather before starting:
- Google account for Firebase console
- Apple Developer account (for iOS OAuth client)
- Android SHA-1 certificate fingerprint
- Expo account (for EAS Build)

### Development Environment
Currently using:
- OS: Windows 10
- Shell: Git Bash
- IDE: Cursor (with AI assistance)
- Workspace: `C:\Users\SamExel\repos\message-ai`

### Git Status
- No commits yet
- Untracked files: project skeleton created
- Ready for initial commit after PRD 01 completion

## Questions to Resolve

### Before Starting PRD 01
- ✅ Do we have Firebase project name decided? → "MessageAI" or similar
- ✅ Do we have bundle ID decided? → Will use com.messageai.app (or similar)
- ❓ Do we have Apple Developer account access? → TBD (needed for iOS OAuth)
- ❓ Do we have physical devices for testing? → TBD

### During PRD 01
- Will document any OAuth issues encountered
- Will note any Windows-specific setup problems
- Will verify emulator performance meets targets

## Next Session Prep

### When Returning to This Project
1. Read this file first (activeContext.md)
2. Check progress.md for what's completed
3. Review current PRD we're working on
4. Check git status for uncommitted changes
5. Read any "Working Notes" sections above

### Context for AI Assistant
- Project is in early stage (planning → implementation transition)
- All requirements are documented in PRDs
- Follow strict performance budgets
- Test coverage is mandatory (70%+)
- 24-hour timeline means ruthless scope management

---

**Next Action:** Start PRD 01 - Project Setup & Infrastructure  
**Expected Duration:** 2 hours  
**Goal:** Working Expo app with Firebase configured and tests passing


