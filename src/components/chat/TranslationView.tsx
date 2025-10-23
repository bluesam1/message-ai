import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

interface TranslationViewProps {
  originalText: string;
  translatedText: string | null;
  isLoading?: boolean;
  error?: string | null;
  targetLanguage: string;
  onToggle?: () => void;
}

/**
 * TranslationView component
 * Displays translated text with toggle between original and translation
 */
export function TranslationView({
  originalText,
  translatedText,
  isLoading = false,
  error = null,
  targetLanguage,
  onToggle,
}: TranslationViewProps) {
  const [showOriginal, setShowOriginal] = useState(false);

  const handleToggle = () => {
    setShowOriginal(!showOriginal);
    onToggle?.();
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Translating...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      </View>
    );
  }

  if (!translatedText) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.translationContainer}>
        <Text style={styles.translationLabel}>
          {showOriginal ? 'Original' : `Translation (${targetLanguage})`}
        </Text>
        <Text style={styles.translationText}>
          {showOriginal ? originalText : translatedText}
        </Text>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={handleToggle}
          activeOpacity={0.7}
        >
          <Text style={styles.toggleText}>
            {showOriginal ? 'Show translation' : 'Show original'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  translationContainer: {
    backgroundColor: '#F0F8FF',
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
  },
  translationLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  translationText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  toggleButton: {
    alignSelf: 'flex-start',
  },
  toggleText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    padding: 12,
    borderRadius: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  errorContainer: {
    backgroundColor: '#FFF3F3',
    borderLeftWidth: 3,
    borderLeftColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#D32F2F',
  },
});

