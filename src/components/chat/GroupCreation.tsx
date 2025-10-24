/**
 * Group Creation Component
 * Multi-step flow for creating a new group conversation
 * Step 1: Enter group name
 * Step 2: Add members by email
 * Step 3: Review and create
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { validateGroupName } from '../../utils/groupValidation';
import { useAuth } from '../../store/AuthContext';
import { createGroup } from '../../services/messaging/conversationService';
import GroupMemberPicker, { PendingMember } from './GroupMemberPicker';

type Step = 'name' | 'members' | 'review';

interface GroupCreationProps {
  onCancel?: () => void;
}

export default function GroupCreation({ onCancel }: GroupCreationProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('name');
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState<PendingMember[]>([]);
  const [loading, setLoading] = useState(false);


  // Step 1: Group Name Validation
  const handleNextFromName = () => {
    const validation = validateGroupName(groupName);
    if (!validation.valid) {
      Alert.alert('Invalid Group Name', validation.error);
      return;
    }
    setStep('members');
  };

  // Step 2: Member Validation
  const handleNextFromMembers = () => {
    if (members.length < 1) {
      Alert.alert(
        'Add Members',
        'Please add at least 1 other member to create a group.'
      );
      return;
    }
    setStep('review');
  };

  // Step 3: Create Group
  const handleCreateGroup = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a group.');
      return;
    }

    setLoading(true);

    try {
      const memberEmails = members.map((m) => m.email);
      const conversation = await createGroup(groupName, memberEmails, user.uid);

      // Navigate directly to the new group chat (no modal needed)
      router.replace(`/chat/${conversation.id}`);
    } catch (error: any) {
      console.error('Error creating group:', error);
      
      let errorMessage = 'Failed to create group. Please try again.';
      if (error.message.includes('not found')) {
        errorMessage = 'One or more email addresses were not found. Please check and try again.';
      } else if (error.message.includes('at least')) {
        errorMessage = 'Please add at least 1 other member to create a group.';
      }
      
      Alert.alert('Error', errorMessage);
      setLoading(false);
    }
  };

  // Navigation between steps
  const handleBack = () => {
    if (step === 'members') {
      setStep('name');
    } else if (step === 'review') {
      setStep('members');
    } else {
      router.back();
    }
  };

  // Step 1: Group Name Input
  if (step === 'name') {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <Text style={styles.stepTitle}>Step 1 of 3</Text>
          <Text style={styles.title}>Name Your Group</Text>
          <Text style={styles.subtitle}>
            Choose a name that represents your group (3-50 characters)
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter group name"
            value={groupName}
            onChangeText={setGroupName}
            maxLength={50}
            autoFocus
            returnKeyType="next"
            onSubmitEditing={handleNextFromName}
          />

          <Text style={styles.charCount}>
            {groupName.length}/50 characters
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                if (onCancel) {
                  onCancel();
                } else {
                  router.back();
                }
              }}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                !groupName.trim() && styles.buttonDisabled,
              ]}
              onPress={handleNextFromName}
              disabled={!groupName.trim()}
            >
              <Text style={styles.primaryButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Step 2: Add Members
  if (step === 'members') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.stepTitle}>Step 2 of 3</Text>
          <Text style={styles.title}>Add Members</Text>
          <Text style={styles.subtitle}>
            Add at least 1 member by email address
          </Text>
        </View>

        <GroupMemberPicker
          onMembersChange={setMembers}
          initialMembers={members}
          excludeEmails={user?.email ? [user.email.toLowerCase()] : []}
        />

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleBack}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              members.length < 1 && styles.buttonDisabled,
            ]}
            onPress={handleNextFromMembers}
            disabled={members.length < 1}
          >
            <Text style={styles.primaryButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Step 3: Review and Create
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.stepTitle}>Step 3 of 3</Text>
          <Text style={styles.title}>Review Group</Text>
          <Text style={styles.subtitle}>
            Review the details before creating your group
          </Text>

          <View style={styles.reviewSection}>
            <Text style={styles.reviewLabel}>Group Name</Text>
            <Text style={styles.reviewValue}>{groupName}</Text>
          </View>

          <View style={styles.reviewSection}>
            <Text style={styles.reviewLabel}>
              Members ({members.length + 1} total)
            </Text>
            <View style={styles.membersList}>
              <View style={styles.memberItem}>
                <Text style={styles.memberEmail}>{user?.email}</Text>
                <Text style={styles.memberBadge}>You (Creator)</Text>
              </View>
              {members.map((member) => (
                <View key={member.email} style={styles.memberItem}>
                  <Text style={styles.memberEmail}>{member.email}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleBack}
          disabled={loading}
        >
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleCreateGroup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Create Group</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  content: {
    padding: 16,
  },
  stepTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 8,
  },
  charCount: {
    fontSize: 14,
    color: '#999',
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  reviewSection: {
    marginBottom: 24,
  },
  reviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  reviewValue: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000',
  },
  membersList: {
    gap: 8,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  memberEmail: {
    fontSize: 16,
    color: '#333',
  },
  memberBadge: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
});

