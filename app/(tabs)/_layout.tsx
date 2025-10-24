/**
 * Main App Tabs Layout
 * 
 * Protected tab navigation for authenticated users
 */

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Conversations',
          tabBarLabel: 'Chats',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      
        {/* Middle tab for new chat */}
        <Tabs.Screen
          name="new-chat-tab"
          options={{
            title: 'New Chat',
            tabBarLabel: '',
            tabBarIcon: ({ color, size }) => null, // Hide default icon
            tabBarButton: (props) => (
              <TouchableOpacity
                onPress={() => router.push('/new-chat')}
                style={{
                  width: 56,
                  height: 56,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: '#007AFF',
                  borderRadius: 28,
                  marginTop: -8,
                  elevation: 4,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  alignSelf: 'center',
                }}
              >
                <Ionicons name="add" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              router.push('/new-chat');
            },
          }}
        />
      
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
