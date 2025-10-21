/**
 * UserPicker Component
 * Searchable user list for starting new conversations
 * Allows users to search by email or display name
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { User } from '../../types/user';

interface UserPickerProps {
  /** Current user ID (to exclude from search results) */
  currentUserId: string;
  /** Callback when a user is selected */
  onUserSelect: (user: User) => void;
  /** Optional placeholder for search input */
  placeholder?: string;
}

/**
 * UserPicker Component
 * Displays a searchable list of users
 */
export default function UserPicker({
  currentUserId,
  onUserSelect,
  placeholder = 'Search users by email or name...',
}: UserPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Search users by email or display name
   */
  const searchUsers = async (term: string) => {
    if (!term.trim()) {
      setUsers([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const usersRef = collection(db, 'users');
      const searchLower = term.toLowerCase();

      // Search by email
      const emailQuery = query(
        usersRef,
        where('email', '>=', searchLower),
        where('email', '<=', searchLower + '\uf8ff'),
        orderBy('email'),
        limit(20)
      );

      const emailSnapshot = await getDocs(emailQuery);
      const emailResults = emailSnapshot.docs
        .map((doc) => ({
          uid: doc.id,
          email: doc.data().email,
          displayName: doc.data().displayName,
          photoURL: doc.data().photoURL || null,
          createdAt: doc.data().createdAt?.toMillis() || Date.now(),
          lastSeen: doc.data().lastSeen?.toMillis() || Date.now(),
        }))
        .filter((user) => user.uid !== currentUserId);

      // Search by display name
      const nameQuery = query(
        usersRef,
        where('displayName', '>=', term),
        where('displayName', '<=', term + '\uf8ff'),
        orderBy('displayName'),
        limit(20)
      );

      const nameSnapshot = await getDocs(nameQuery);
      const nameResults = nameSnapshot.docs
        .map((doc) => ({
          uid: doc.id,
          email: doc.data().email,
          displayName: doc.data().displayName,
          photoURL: doc.data().photoURL || null,
          createdAt: doc.data().createdAt?.toMillis() || Date.now(),
          lastSeen: doc.data().lastSeen?.toMillis() || Date.now(),
        }))
        .filter((user) => user.uid !== currentUserId);

      // Combine and deduplicate results
      const combinedResults = [...emailResults, ...nameResults];
      const uniqueUsers = Array.from(
        new Map(combinedResults.map((user) => [user.uid, user])).values()
      );

      setUsers(uniqueUsers);
    } catch (err) {
      console.error('[UserPicker] Search error:', err);
      setError('Failed to search users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Debounced search effect
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchTerm);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchTerm]);

  /**
   * Render a single user item
   */
  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => onUserSelect(item)}
      activeOpacity={0.7}
    >
      {/* User Avatar */}
      {item.photoURL ? (
        <Image source={{ uri: item.photoURL }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarText}>
            {item.displayName?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
      )}

      {/* User Info */}
      <View style={styles.userInfo}>
        <Text style={styles.displayName}>{item.displayName}</Text>
        <Text style={styles.email}>{item.email}</Text>
      </View>
    </TouchableOpacity>
  );

  /**
   * Render empty state
   */
  const renderEmptyState = () => {
    if (loading) {
      return null;
    }

    if (error) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      );
    }

    if (searchTerm.trim() === '') {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            Start typing to search for users
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>No users found</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          value={searchTerm}
          onChangeText={setSearchTerm}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
        />
        {loading && (
          <ActivityIndicator
            size="small"
            color="#007AFF"
            style={styles.loadingIndicator}
          />
        )}
      </View>

      {/* User List */}
      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.uid}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  searchInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    fontSize: 16,
  },
  loadingIndicator: {
    marginLeft: 12,
  },
  listContent: {
    flexGrow: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#8E8E93',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
});

