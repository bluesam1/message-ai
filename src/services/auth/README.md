# Authentication Persistence Service

## Current Implementation

This service provides authentication persistence using **Expo SecureStore** for **encrypted persistent storage** that works with **Expo Go** without custom dev builds.

### How It Works

- **Web**: Uses localStorage for persistent storage
- **React Native**: Uses Expo SecureStore for encrypted persistent storage
- **Expo Compatible**: Works in Expo Go without custom dev builds
- **Firebase Integration**: Works with Firebase Auth state changes

### Benefits

- **Force Close**: Data persists when app is force-closed (killed from task manager)
- **App Restart**: User stays logged in after app restart
- **Encrypted Storage**: Data is encrypted using device keychain/keystore
- **Cross Platform**: Works on web, iOS, and Android

### Technical Details

- **Web**: Uses browser localStorage for persistent storage
- **React Native**: Uses Expo SecureStore for encrypted persistent storage
- **Expo**: Works in Expo Go without custom dev builds
- **Persistence**: Survives app lifecycle events and force closes

### Usage

```typescript
import { authPersistenceService } from './authPersistenceService';

// Store user data
await authPersistenceService.storeAuthData(user, token);

// Retrieve user data
const user = await authPersistenceService.getStoredAuthData();

// Clear user data
await authPersistenceService.clearAuthData();
```

### Testing

- ✅ **App Backgrounding**: User stays logged in
- ✅ **App Foregrounding**: User remains authenticated
- ✅ **Force Close**: User stays logged in (SecureStore)
- ✅ **App Restart**: User remains authenticated
- ✅ **Device Reboot**: User stays logged in
- ✅ **Normal Logout**: User data is cleared

This is a **production-ready solution** with encrypted SecureStore persistence.
