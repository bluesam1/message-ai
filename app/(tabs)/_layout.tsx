/**
 * Main App Tabs Layout
 * 
 * Protected tab navigation for authenticated users
 */

import { Tabs } from 'expo-router';
import { TouchableOpacity, Text, Alert } from 'react-native';
import { useAuth } from '../../src/store/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../src/config/firebase';

export default function TabsLayout() {
  const { user } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        // Hide the tab bar completely to prevent animation crashes
        tabBarStyle: {
          display: 'none',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Conversations',
          tabBarLabel: 'Chats',
          headerRight: () => (
            <TouchableOpacity
              onPress={handleLogout}
              style={{ marginRight: 16 }}
            >
              <Text style={{ fontSize: 16, color: '#007AFF' }}>Logout</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
        }}
      />
    </Tabs>
  );
}


