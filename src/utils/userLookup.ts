/**
 * User Lookup Service
 * 
 * Provides utilities for finding users by email address.
 * Used primarily for adding members to group chats by email.
 */

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { User } from '../types/user';

/**
 * Looks up a user by their email address
 * 
 * @param email - Email address to search for (case-insensitive)
 * @returns User object if found, null if not found
 * @throws Error if Firestore query fails
 * 
 * @example
 * const user = await getUserByEmail('alice@example.com');
 * if (user) {
 *   console.log(`Found user: ${user.displayName}`);
 * } else {
 *   console.log('User not found');
 * }
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    if (!email || typeof email !== 'string') {
      return null;
    }

    // Normalize email to lowercase for case-insensitive search
    const normalizedEmail = email.toLowerCase().trim();

    // Query Firestore users collection
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', normalizedEmail));
    const snapshot = await getDocs(q);

    // Return first matching user (email should be unique)
    if (snapshot.empty) {
      return null;
    }

    const userData = snapshot.docs[0].data();
    
    // Convert Firestore document to User type
    return {
      uid: userData.uid,
      email: userData.email,
      displayName: userData.displayName,
      photoURL: userData.photoURL || null,
      online: userData.online || false,
      createdAt: userData.createdAt?.toMillis?.() || Date.now(),
      lastSeen: userData.lastSeen?.toMillis?.() || Date.now(),
    };
  } catch (error) {
    console.error('Error looking up user by email:', error);
    throw new Error('Failed to look up user. Please check your connection.');
  }
}

/**
 * Looks up multiple users by their email addresses
 * Returns only the user IDs for users that exist
 * 
 * @param emails - Array of email addresses to look up
 * @returns Array of user IDs for found users (in same order as input where found)
 * @throws Error if any Firestore query fails
 * 
 * @example
 * const emails = ['alice@example.com', 'bob@example.com', 'nonexistent@example.com'];
 * const userIds = await getUserIdsByEmails(emails);
 * // Returns: ['user123', 'user456'] (only existing users)
 */
export async function getUserIdsByEmails(emails: string[]): Promise<string[]> {
  try {
    if (!Array.isArray(emails) || emails.length === 0) {
      return [];
    }

    // Look up all users in parallel
    const userPromises = emails.map((email) => getUserByEmail(email));
    const users = await Promise.all(userPromises);

    // Filter out null results and extract UIDs
    return users
      .filter((user): user is User => user !== null)
      .map((user) => user.uid);
  } catch (error) {
    console.error('Error looking up users by emails:', error);
    throw new Error('Failed to look up users. Please check your connection.');
  }
}

/**
 * Looks up multiple users by their email addresses
 * Returns full user objects for all found users
 * 
 * @param emails - Array of email addresses to look up
 * @returns Array of User objects for found users
 * @throws Error if any Firestore query fails
 * 
 * @example
 * const emails = ['alice@example.com', 'bob@example.com'];
 * const users = await getUsersByEmails(emails);
 * users.forEach(user => console.log(user.displayName));
 */
export async function getUsersByEmails(emails: string[]): Promise<User[]> {
  try {
    if (!Array.isArray(emails) || emails.length === 0) {
      return [];
    }

    // Look up all users in parallel
    const userPromises = emails.map((email) => getUserByEmail(email));
    const users = await Promise.all(userPromises);

    // Filter out null results
    return users.filter((user): user is User => user !== null);
  } catch (error) {
    console.error('Error looking up users by emails:', error);
    throw new Error('Failed to look up users. Please check your connection.');
  }
}

/**
 * Validates that all provided emails correspond to existing users
 * Returns information about which emails are valid and which are not found
 * 
 * @param emails - Array of email addresses to validate
 * @returns Object with valid user IDs and array of emails not found
 * 
 * @example
 * const result = await validateEmails(['alice@example.com', 'invalid@example.com']);
 * // Returns: { validUserIds: ['user123'], notFoundEmails: ['invalid@example.com'] }
 */
export async function validateEmails(
  emails: string[]
): Promise<{ validUserIds: string[]; notFoundEmails: string[] }> {
  try {
    if (!Array.isArray(emails) || emails.length === 0) {
      return { validUserIds: [], notFoundEmails: [] };
    }

    const normalizedEmails = emails.map((e) => e.toLowerCase().trim());
    const userPromises = normalizedEmails.map((email) => getUserByEmail(email));
    const users = await Promise.all(userPromises);

    const validUserIds: string[] = [];
    const notFoundEmails: string[] = [];

    users.forEach((user, index) => {
      if (user) {
        validUserIds.push(user.uid);
      } else {
        notFoundEmails.push(normalizedEmails[index]);
      }
    });

    return { validUserIds, notFoundEmails };
  } catch (error) {
    console.error('Error validating emails:', error);
    throw new Error('Failed to validate emails. Please check your connection.');
  }
}

