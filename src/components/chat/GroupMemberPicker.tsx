/**
 * Group Member Picker Component
 * Searchable user interface for adding members to groups
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
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

export interface PendingMember {
  email: string;
  id?: string;
  displayName?: string;
}

interface GroupMemberPickerProps {
  onMembersChange: (members: PendingMember[]) => void;
  initialMembers?: PendingMember[];
  excludeEmails?: string[]; // Emails to exclude (e.g., current user, existing members)
}

/**
 * Helper function to safely convert various timestamp formats to milliseconds
 */
function toMillis(timestamp: any): number {
  if (!timestamp) {
    return Date.now();
  }
  
  if (typeof timestamp === 'number') {
    return timestamp;
  }
  
  if (timestamp && typeof timestamp.toMillis === 'function') {
    return timestamp.toMillis();
  }
  
  return Date.now();
}

export default function GroupMemberPicker({
  onMembersChange,
  initialMembers = [],
  excludeEmails = [],
}: GroupMemberPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<PendingMember[]>(initialMembers);

  /**
   * Search users by email or display name
   */
  const searchUsers = async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);

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
          online: doc.data().online || false,
          createdAt: toMillis(doc.data().createdAt),
          lastSeen: toMillis(doc.data().lastSeen),
        }))
        .filter((user) => 
          !excludeEmails.includes(user.email.toLowerCase()) &&
          !members.some(m => m.email.toLowerCase() === user.email.toLowerCase())
        );

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
          online: doc.data().online || false,
          createdAt: toMillis(doc.data().createdAt),
          lastSeen: toMillis(doc.data().lastSeen),
        }))
        .filter((user) => 
          !excludeEmails.includes(user.email.toLowerCase()) &&
          !members.some(m => m.email.toLowerCase() === user.email.toLowerCase())
        );

      // Combine and deduplicate results
      const combinedResults = [...emailResults, ...nameResults];
      const uniqueUsers = Array.from(
        new Map(combinedResults.map((user) => [user.uid, user])).values()
      );

      setSearchResults(uniqueUsers);
    } catch (err) {
      console.error('[GroupMemberPicker] Search error:', err);
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
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, members, excludeEmails]);

  const handleAddMember = (user: User) => {
    // Check if email is excluded
    if (excludeEmails.includes(user.email.toLowerCase())) {
      Alert.alert('Cannot Add', 'This user is already included.');
      return;
    }

    // Check for duplicates
    if (members.some((m) => m.email.toLowerCase() === user.email.toLowerCase())) {
      Alert.alert('Duplicate User', 'This user has already been added.');
      return;
    }

    // Add member to list
    const newMember: PendingMember = { 
      email: user.email,
      id: user.uid,
      displayName: user.displayName,
    };
    const updatedMembers = [...members, newMember];
    setMembers(updatedMembers);
    onMembersChange(updatedMembers);
    setSearchTerm(''); // Clear search
  };

  const handleRemoveMember = (email: string) => {
    const updatedMembers = members.filter((m) => m.email !== email);
    setMembers(updatedMembers);
    onMembersChange(updatedMembers);
  };

  const renderMember = ({ item }: { item: PendingMember }) => (
    <View style={styles.memberChip}>
      <Text style={styles.chipText} numberOfLines={1}>
        {item.displayName || item.email}
      </Text>
      <TouchableOpacity
        onPress={() => handleRemoveMember(item.email)}
        style={styles.chipRemoveButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.chipRemoveText}>×</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Render search result item
   */
  const renderSearchResult = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.searchResultItem}
      onPress={() => handleAddMember(item)}
      activeOpacity={0.7}
    >
      {item.photoURL ? (
        <Image source={{ uri: item.photoURL }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarText}>
            {item.displayName?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
      )}
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.displayName}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users by name or email..."
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

      {/* Selected Members */}
      {members.length > 0 && (
        <View style={styles.selectedSection}>
          <Text style={styles.selectedTitle}>
            Selected ({members.length})
          </Text>
          <View style={styles.chipsContainer}>
            {members.map((member) => (
              <View key={member.email} style={styles.memberChip}>
                <Text style={styles.chipText} numberOfLines={1}>
                  {member.displayName || member.email}
                </Text>
                <TouchableOpacity
                  onPress={() => handleRemoveMember(member.email)}
                  style={styles.chipRemoveButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.chipRemoveText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Search Results */}
      {searchTerm.trim() !== '' && (
        <View style={styles.resultsSection}>
          {searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.uid}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            !loading && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No users found</Text>
              </View>
            )
          )}
        </View>
      )}

      {/* Empty State */}
      {searchTerm.trim() === '' && members.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            Start typing to search for users
          </Text>
        </View>
      )}
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
  selectedSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#F8F9FA',
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
    maxWidth: '80%',
  },
  chipText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
    marginRight: 8,
    flexShrink: 1,
  },
  chipRemoveButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipRemoveText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
    lineHeight: 20,
  },
  resultsSection: {
    flex: 1,
  },
  searchResultItem: {
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
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#8E8E93',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
});

