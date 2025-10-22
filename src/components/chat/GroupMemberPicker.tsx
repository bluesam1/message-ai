/**
 * Group Member Picker Component
 * Allows adding members to a group by email address
 * 
 * MVP Implementation: Users must enter exact email addresses
 * 
 * Future Enhancement: Could add user search/browse functionality:
 * - Search users by name or email
 * - Browse all users with autocomplete
 * - Show user avatars and names in search results
 * - Select users from a list instead of typing emails
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { isValidEmail } from '../../utils/groupValidation';

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

export default function GroupMemberPicker({
  onMembersChange,
  initialMembers = [],
  excludeEmails = [],
}: GroupMemberPickerProps) {
  const [emailInput, setEmailInput] = useState('');
  const [members, setMembers] = useState<PendingMember[]>(initialMembers);

  const handleAddMember = () => {
    const trimmedEmail = emailInput.trim().toLowerCase();

    // Validate email format
    if (!isValidEmail(trimmedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    // Check if email is excluded
    if (excludeEmails.includes(trimmedEmail)) {
      Alert.alert('Cannot Add', 'This user is already included.');
      return;
    }

    // Check for duplicates
    if (members.some((m) => m.email.toLowerCase() === trimmedEmail)) {
      Alert.alert('Duplicate Email', 'This email has already been added.');
      return;
    }

    // Add member to list
    const newMember: PendingMember = { email: trimmedEmail };
    const updatedMembers = [...members, newMember];
    setMembers(updatedMembers);
    onMembersChange(updatedMembers);
    setEmailInput('');
  };

  const handleRemoveMember = (email: string) => {
    const updatedMembers = members.filter((m) => m.email !== email);
    setMembers(updatedMembers);
    onMembersChange(updatedMembers);
  };

  const renderMember = ({ item }: { item: PendingMember }) => (
    <View style={styles.memberItem}>
      <View style={styles.memberInfo}>
        <Text style={styles.memberEmail}>{item.email}</Text>
        {item.displayName && (
          <Text style={styles.memberName}>{item.displayName}</Text>
        )}
      </View>
      <TouchableOpacity
        onPress={() => handleRemoveMember(item.email)}
        style={styles.removeButton}
      >
        <Text style={styles.removeButtonText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          Enter email addresses of users you want to add to the group
        </Text>
      </View>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="user@example.com"
          value={emailInput}
          onChangeText={setEmailInput}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={handleAddMember}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddMember}
          disabled={!emailInput.trim()}
        >
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {members.length > 0 && (
        <View style={styles.membersSection}>
          <Text style={styles.membersSectionTitle}>
            Members ({members.length})
          </Text>
          <FlatList
            data={members}
            renderItem={renderMember}
            keyExtractor={(item) => item.email}
            style={styles.membersList}
          />
        </View>
      )}

      {members.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No members added yet. Enter email addresses above.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  instructionsContainer: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  membersSection: {
    flex: 1,
    padding: 16,
  },
  membersSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  membersList: {
    flex: 1,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
  memberInfo: {
    flex: 1,
  },
  memberEmail: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  memberName: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  removeButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});

