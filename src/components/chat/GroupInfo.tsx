/**
 * Group Info Component
 * Displays group information including name, members, and actions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { Conversation } from '../../types/message';
import { User } from '../../types/user';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import GroupMemberPicker, { PendingMember } from './GroupMemberPicker';
import { addMembersToGroup } from '../../services/messaging/conversationService';
import { useAuth } from '../../store/AuthContext';

interface GroupInfoProps {
  conversation: Conversation;
  currentUserId: string;
  visible: boolean;
  onClose: () => void;
}

interface MemberInfo extends User {
  isCreator: boolean;
}

export default function GroupInfo({
  conversation,
  currentUserId,
  visible,
  onClose,
}: GroupInfoProps) {
  const { user } = useAuth();
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [addingMembers, setAddingMembers] = useState(false);
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);

  // Load member information
  useEffect(() => {
    const loadMembers = async () => {
      if (!visible) return;

      try {
        setLoading(true);

        // Fetch all member details
        const memberPromises = conversation.participants.map(async (uid) => {
          const usersRef = collection(db, 'users');
          const userQuery = query(usersRef, where('uid', '==', uid));
          const userSnapshot = await getDocs(userQuery);

          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            return {
              uid: userData.uid,
              email: userData.email,
              displayName: userData.displayName,
              photoURL: userData.photoURL || null,
              createdAt: userData.createdAt?.toMillis() || Date.now(),
              lastSeen: userData.lastSeen?.toMillis() || Date.now(),
              isCreator: uid === conversation.createdBy,
            } as MemberInfo;
          }
          return null;
        });

        const memberData = await Promise.all(memberPromises);
        const validMembers = memberData.filter((m): m is MemberInfo => m !== null);

        // Sort: creator first, then alphabetically
        validMembers.sort((a, b) => {
          if (a.isCreator) return -1;
          if (b.isCreator) return 1;
          return a.displayName.localeCompare(b.displayName);
        });

        setMembers(validMembers);
        setLoading(false);
      } catch (error) {
        console.error('Error loading members:', error);
        setLoading(false);
      }
    };

    loadMembers();
  }, [visible, conversation]);

  // Handle adding new members
  const handleAddMembers = async () => {
    if (pendingMembers.length === 0) return;

    try {
      setAddingMembers(true);

      const emails = pendingMembers.map((m) => m.email);
      await addMembersToGroup(conversation.id, emails);

      // Close modal and refresh
      setShowAddMembers(false);
      setPendingMembers([]);
      
      // Refresh member list by reloading
      const usersRef = collection(db, 'users');
      const userQuery = query(
        usersRef,
        where('email', 'in', emails)
      );
      const userSnapshot = await getDocs(userQuery);
      
      const newMembers: MemberInfo[] = userSnapshot.docs.map((doc) => {
        const userData = doc.data();
        return {
          uid: userData.uid,
          email: userData.email,
          displayName: userData.displayName,
          photoURL: userData.photoURL || null,
          createdAt: userData.createdAt?.toMillis() || Date.now(),
          lastSeen: userData.lastSeen?.toMillis() || Date.now(),
          isCreator: false,
        };
      });

      setMembers([...members, ...newMembers]);
      setAddingMembers(false);
    } catch (error: any) {
      console.error('Error adding members:', error);
      alert(error.message || 'Failed to add members');
      setAddingMembers(false);
    }
  };

  // Render a member item
  const renderMember = ({ item }: { item: MemberInfo }) => {
    const isCurrentUser = item.uid === currentUserId;

    return (
      <View style={styles.memberItem}>
        {/* Avatar */}
        {item.photoURL ? (
          <Image source={{ uri: item.photoURL }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {item.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        {/* Member Info */}
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>
            {item.displayName}
            {isCurrentUser && ' (You)'}
          </Text>
          <Text style={styles.memberEmail}>{item.email}</Text>
        </View>

        {/* Creator Badge */}
        {item.isCreator && (
          <View style={styles.creatorBadge}>
            <Text style={styles.creatorBadgeText}>Creator</Text>
          </View>
        )}
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={onClose} 
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Group Info</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Group Details */}
        <View style={styles.groupDetails}>
          <View style={styles.groupIconContainer}>
            <View style={styles.groupIcon}>
              <Text style={styles.groupIconText}>
                {(conversation.groupName || 'G').charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.groupName}>{conversation.groupName}</Text>
          <Text style={styles.memberCount}>
            {conversation.participants.length} members
          </Text>
        </View>

        {/* Add Members Button */}
        <TouchableOpacity
          style={styles.addMembersButton}
          onPress={() => setShowAddMembers(true)}
        >
          <Text style={styles.addMembersButtonText}>➕ Add Members</Text>
        </TouchableOpacity>

        {/* Members List */}
        <View style={styles.membersSection}>
          <Text style={styles.sectionTitle}>Members</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : (
            <FlatList
              data={members}
              renderItem={renderMember}
              keyExtractor={(item) => item.uid}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* Add Members Modal */}
        <Modal
          visible={showAddMembers}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowAddMembers(false)}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => setShowAddMembers(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Add Members</Text>
              <TouchableOpacity
                onPress={handleAddMembers}
                style={styles.closeButton}
                disabled={pendingMembers.length === 0 || addingMembers}
              >
                {addingMembers ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <Text
                    style={[
                      styles.doneButtonText,
                      pendingMembers.length === 0 && styles.doneButtonDisabled,
                    ]}
                  >
                    Add
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <GroupMemberPicker
              onMembersChange={setPendingMembers}
              initialMembers={pendingMembers}
              excludeEmails={[
                ...members.map((m) => m.email.toLowerCase()),
                // Always exclude current user's email explicitly
                ...(user?.email ? [user.email.toLowerCase()] : []),
              ]}
            />
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  closeButton: {
    minWidth: 70,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  closeButtonText: {
    color: '#007AFF',
    fontSize: 17,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    minWidth: 70,
  },
  groupDetails: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  groupIconContainer: {
    marginBottom: 16,
  },
  groupIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupIconText: {
    fontSize: 36,
    fontWeight: '600',
    color: '#fff',
  },
  groupName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  memberCount: {
    fontSize: 16,
    color: '#666',
  },
  addMembersButton: {
    margin: 16,
    padding: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  addMembersButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  membersSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    color: '#666',
  },
  creatorBadge: {
    backgroundColor: '#FFD60A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  creatorBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '600',
  },
  doneButtonDisabled: {
    opacity: 0.4,
  },
});

