/**
 * Home/Conversations Screen
 * 
 * Placeholder for conversations list
 * Will be implemented in PRD 03 (Core Messaging)
 * 
 * Currently displays authenticated user info for testing
 */

import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../../src/store/AuthContext';

export default function HomeScreen() {
  const { user } = useAuth();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>✅ Authentication Success!</Text>
          <Text style={styles.subtitle}>You are signed in</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>User Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>User ID:</Text>
            <Text style={styles.value}>{user?.uid}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Display Name:</Text>
            <Text style={styles.value}>{user?.displayName || 'Not set'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{user?.email || 'Not set'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Photo URL:</Text>
            <Text style={styles.value} numberOfLines={2}>
              {user?.photoURL || 'No photo'}
            </Text>
          </View>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>🎉 What's Working</Text>
          <Text style={styles.statusItem}>✓ Firebase Auth connected</Text>
          <Text style={styles.statusItem}>✓ User session persisted</Text>
          <Text style={styles.statusItem}>✓ Profile data loaded</Text>
          <Text style={styles.statusItem}>✓ Navigation protecting routes</Text>
        </View>

        <View style={styles.nextSteps}>
          <Text style={styles.nextTitle}>📋 Next: PRD 03</Text>
          <Text style={styles.nextText}>Core One-on-One Messaging</Text>
          <Text style={styles.nextSubtext}>
            Conversations list will appear here once messaging is implemented
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  infoRow: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f8f8f8',
    padding: 8,
    borderRadius: 6,
    fontFamily: 'monospace',
  },
  statusCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#2e7d32',
  },
  statusItem: {
    fontSize: 14,
    color: '#2e7d32',
    marginBottom: 6,
  },
  nextSteps: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  nextTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  nextText: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 8,
    fontWeight: '500',
  },
  nextSubtext: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

