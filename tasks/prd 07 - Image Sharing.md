# PRD 07: Image Sharing

## Overview
Enable users to select images from their device gallery, compress them for optimal upload, store them in Firebase Storage, and display them within messages. This adds rich media capabilities to the messaging experience.

**Timeline:** Hours 19-21 of 24-hour MVP development  
**Priority:** CRITICAL (Core requirement)

---

## Goals
1. Allow users to select images from device gallery
2. Compress images before upload (1920px max, 80% quality)
3. Upload images to Firebase Storage
4. Generate and store public URLs
5. Display images inline within messages
6. Handle loading and error states gracefully

---

## User Stories
- **US-012:** As a user, I want to upload images from my gallery so I can share photos in conversations
- **US-013:** As a user, I want to view images in messages so I can see shared photos
- **US-IMG-001:** As a user, I want images to upload quickly so I don't wait too long
- **US-IMG-002:** As a user, I want to see a preview before sending so I can confirm the right image
- **US-IMG-003:** As a user, I want to see upload progress so I know how long it will take

---

## Functional Requirements

### Image Selection

1. Add image picker button to message input:
   - Icon: 📷 or gallery icon
   - Position: Left of text input field

2. On button press, open device gallery using `expo-image-picker`:
   - Allow single image selection (no multi-select for MVP)
   - Support common formats: JPG, PNG, HEIC
   - Return image URI and metadata (width, height, size)

3. Request gallery permissions:
   - Android: `READ_EXTERNAL_STORAGE` or `READ_MEDIA_IMAGES`
   - iOS: Photo Library permission
   - Show permission denied message if user blocks

### Image Compression

4. After image selected, compress before upload:
   - Maximum dimension: 1920px (maintain aspect ratio)
   - JPEG quality: 80%
   - Use `expo-image-manipulator` for resizing
   - Original aspect ratio preserved

5. Display compression progress (optional):
   - Show "Preparing image..." message
   - Usually completes in < 1 second

### Image Upload

6. Upload compressed image to Firebase Storage:
   - Path structure: `messages/{userId}/{timestamp}_{random}.jpg`
   - Generate unique filename to prevent collisions
   - Set metadata: contentType, customMetadata (senderId, conversationId)

7. Display upload progress:
   - Show progress bar (0-100%)
   - Allow cancellation (optional for MVP)
   - Handle upload failures gracefully

8. On upload success:
   - Get public download URL
   - Create message with `imageUrl` field
   - Send message to Firestore

### Message Creation with Images

9. Create image message object:
   ```typescript
   {
     id: string,
     conversationId: string,
     senderId: string,
     text: string | null,  // Optional caption
     imageUrl: string,     // Firebase Storage URL
     timestamp: number,
     status: "pending" | "sent" | "failed",
     readBy: string[],
   }
   ```

10. Support image-only messages (no text required)

11. Support image + text (caption):
    - Show text input while image is selected
    - Send both image and text together

### Image Display

12. Render image messages in chat:
    - Display image with max width (80% of screen)
    - Maintain aspect ratio
    - Show rounded corners for consistency
    - Display caption below image if present

13. Implement image loading states:
    - Show skeleton/placeholder while loading
    - Display low-res blur-up effect (optional)
    - Show error icon if image fails to load

14. Make images tappable:
    - Tap to view full-screen (optional for MVP)
    - Pinch to zoom (optional for MVP)
    - For MVP: Can just open image in modal or browser

### Optimistic UI for Images

15. Show image immediately after selection:
    - Display local URI while uploading
    - Show upload progress overlay
    - Replace with Firebase URL after upload

16. Handle upload failures:
    - Show retry button on failed image messages
    - Allow user to resend
    - Don't save failed uploads to Firestore

### Storage & Caching

17. Cache image URLs in SQLite:
    - Store Firebase Storage URL in messages table
    - Load from cache first, then Firebase

18. Implement basic image caching:
    - Use React Native Image component's built-in cache
    - No need for custom cache implementation in MVP

---

## Non-Goals (Out of Scope)
- ❌ Camera capture (defer to post-MVP or cut if time-constrained)
- ❌ Multi-image selection (post-MVP)
- ❌ Video uploads (post-MVP)
- ❌ GIF support (post-MVP)
- ❌ Image filters/editing (post-MVP)
- ❌ Full-screen image viewer with gestures (nice-to-have, not critical)
- ❌ Image thumbnails generation (use Storage URLs directly)

---

## Performance Requirements

| Action | Target | Maximum |
|--------|--------|---------|
| Open gallery picker | < 500ms | 1s |
| Compress image | < 1s | 3s |
| Upload 2MB image | < 5s | 10s |
| Display cached image | < 100ms | 200ms |
| Message send with image | < 6s total | 12s |

**Image size targets:**
- Original: Could be 5-10MB
- After compression: < 500KB (typical)
- Maximum: 5MB (reject larger files)

---

## Technical Considerations

### Image Picker Setup
```typescript
// src/services/media/imagePickerService.ts
import * as ImagePicker from 'expo-image-picker';

export const imagePickerService = {
  requestPermissions: async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  },
  
  pickImage: async (): Promise<ImagePicker.ImagePickerAsset | null> => {
    const hasPermission = await imagePickerService.requestPermissions();
    
    if (!hasPermission) {
      throw new Error('Gallery permission denied');
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,  // Allow crop (optional)
      quality: 1,           // Get full quality, we'll compress ourselves
      exif: false,          // Don't need EXIF data
    });
    
    if (result.canceled) return null;
    
    return result.assets[0];
  },
};
```

### Image Compression Service
```typescript
// src/services/media/imageCompressionService.ts
import * as ImageManipulator from 'expo-image-manipulator';

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.8;

export const imageCompressionService = {
  compressImage: async (uri: string): Promise<string> => {
    // Get image dimensions
    const { width, height } = await getImageSize(uri);
    
    // Calculate resize dimensions
    const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height, 1);
    const newWidth = Math.round(width * scale);
    const newHeight = Math.round(height * scale);
    
    // Compress
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: newWidth, height: newHeight } }],
      { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
    );
    
    return result.uri;
  },
};
```

### Firebase Storage Upload Service
```typescript
// src/services/firebase/storageService.ts
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/config/firebase';

export const storageService = {
  uploadImage: async (
    imageUri: string,
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<string> => {
    // Generate unique filename
    const filename = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
    const storagePath = `messages/${userId}/${filename}`;
    
    // Create reference
    const storageRef = ref(storage, storagePath);
    
    // Convert URI to blob
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    // Upload with progress tracking
    const uploadTask = uploadBytesResumable(storageRef, blob, {
      contentType: 'image/jpeg',
    });
    
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.(progress);
        },
        (error) => reject(error),
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  },
  
  deleteImage: async (imageUrl: string) => {
    // Extract path from URL and delete (optional for MVP)
  },
};
```

### Image Message Component
```typescript
// src/components/chat/ImageMessage.tsx
import { Image, ActivityIndicator, View, Text } from 'react-native';
import { useState } from 'react';

interface ImageMessageProps {
  imageUrl: string;
  caption?: string;
  onPress?: () => void;
}

export function ImageMessage({ imageUrl, caption, onPress }: ImageMessageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  return (
    <View>
      <Pressable onPress={onPress}>
        <Image
          source={{ uri: imageUrl }}
          style={{ width: 250, height: 250, borderRadius: 8 }}
          resizeMode="cover"
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        />
        {loading && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
        {error && (
          <View style={styles.overlay}>
            <Text style={styles.errorText}>Failed to load image</Text>
          </View>
        )}
      </Pressable>
      {caption && <Text style={styles.caption}>{caption}</Text>}
    </View>
  );
}
```

### Send Image Message Flow
```typescript
// src/services/messaging/imageMessageService.ts
export const imageMessageService = {
  sendImageMessage: async (
    conversationId: string,
    senderId: string,
    imageUri: string,
    caption?: string,
    onProgress?: (progress: number) => void
  ) => {
    // 1. Compress image
    onProgress?.(10);
    const compressedUri = await imageCompressionService.compressImage(imageUri);
    
    // 2. Upload to Storage
    onProgress?.(20);
    const imageUrl = await storageService.uploadImage(
      compressedUri,
      senderId,
      (uploadProgress) => {
        onProgress?.(20 + (uploadProgress * 0.7)); // 20-90%
      }
    );
    
    // 3. Create message
    onProgress?.(90);
    const message = {
      id: generateMessageId(),
      conversationId,
      senderId,
      text: caption || null,
      imageUrl,
      timestamp: Date.now(),
      status: 'sent',
      readBy: [senderId],
    };
    
    // 4. Save to Firestore
    await messageService.sendMessage(message);
    onProgress?.(100);
  },
};
```

---

## Design Considerations

### Message Input with Image Button
```
┌────────────────────────────────────┐
│ [📷] [Text Input...]  [Send]      │
└────────────────────────────────────┘
```

### Image Message Display
```
┌────────────────────────┐
│                        │
│                        │
│    [Image Preview]     │
│                        │
│                        │
├────────────────────────┤
│ Caption text here      │
│ 2:30 PM ✓✓             │
└────────────────────────┘
```

### Upload Progress Overlay
```
┌────────────────────────┐
│                        │
│  [Image with overlay]  │
│  Uploading... 45%      │
│  [Progress Bar]        │
└────────────────────────┘
```

---

## Success Metrics
- ✅ Users can select images from gallery
- ✅ Images compressed to < 500KB typical
- ✅ Upload completes within performance targets
- ✅ Images display correctly in messages
- ✅ Loading states work properly
- ✅ Failed uploads show retry option

---

## Acceptance Criteria
- [ ] Gallery picker button visible in message input
- [ ] Tapping button opens device gallery
- [ ] Permission request shown if not granted
- [ ] Permission denial handled gracefully
- [ ] Selected image compressed before upload
- [ ] Compression maintains aspect ratio and quality
- [ ] Image uploads to Firebase Storage successfully
- [ ] Upload progress displayed (0-100%)
- [ ] Download URL generated after upload
- [ ] Message created with imageUrl field
- [ ] Image message sent to Firestore
- [ ] Images display in chat with correct dimensions
- [ ] Loading indicator shows while image loads
- [ ] Error state shows if image fails to load
- [ ] Optional caption can be added to images
- [ ] Images work in both one-on-one and group chats
- [ ] Images cached for faster subsequent loads
- [ ] Failed uploads show retry button
- [ ] Test with various image sizes (100KB to 10MB)
- [ ] Test on both Android and iOS

---

## Testing Requirements

### Manual Testing (No unit tests needed for media handling)
- [ ] Select image from gallery, verify opens correctly
- [ ] Test with small image (< 1MB), verify uploads quickly
- [ ] Test with large image (> 5MB), verify compresses correctly
- [ ] Test with very wide image (panorama), verify aspect ratio maintained
- [ ] Test with very tall image (screenshot), verify aspect ratio maintained
- [ ] Send image-only message, verify displays correctly
- [ ] Send image with caption, verify both show correctly
- [ ] Turn off WiFi during upload, verify failure handling
- [ ] Retry failed upload, verify works
- [ ] Scroll through conversation with 20+ images, test performance
- [ ] Test image loading from cache (close and reopen conversation)
- [ ] Test on Android device with various gallery apps
- [ ] Test on iOS device with Photos app
- [ ] Test with HEIC images (iPhone), verify converts to JPEG

---

## Open Questions
- Should we implement camera capture in MVP? (Recommendation: Defer to post-MVP if time-constrained)
- Maximum image file size limit? (Recommendation: 10MB hard limit, compress everything)
- Should we generate thumbnails? (Recommendation: No, use full URLs for MVP)

---

## Dependencies
- **Depends on:** PRD 03 (Core Messaging) - extends messages with images
- **Can develop in parallel with:** PRD 06 (Read Receipts), PRD 08 (Push Notifications)

---

## Resources
- [Expo ImagePicker Documentation](https://docs.expo.dev/versions/latest/sdk/imagepicker/)
- [Expo ImageManipulator Documentation](https://docs.expo.dev/versions/latest/sdk/imagemanipulator/)
- [Firebase Storage Upload Files](https://firebase.google.com/docs/storage/web/upload-files)



