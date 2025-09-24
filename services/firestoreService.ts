import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc,
  Timestamp,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { AppState, SavedSession } from '../types';

const USERS_COLLECTION = 'users';
const SESSIONS_COLLECTION = 'sessions';

/**
 * Recursively removes properties with `undefined` values from an object or array.
 * Firestore does not support `undefined` values and will throw an error.
 * This function sanitizes the state before it's sent to the database.
 * @param obj The object or array to clean.
 * @returns A new object or array with `undefined` values removed.
 */
const removeUndefinedValues = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedValues(item));
  } else if (obj !== null && typeof obj === 'object') {
    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        if (value !== undefined) {
          newObj[key] = removeUndefinedValues(value);
        }
      }
    }
    return newObj;
  }
  return obj;
};

/**
 * Creates a new session document in Firestore for a user.
 * @param userId The UID of the authenticated user.
 * @param state The initial state of the application to save.
 * @returns The ID of the newly created session document.
 */
export const createSession = async (userId: string, state: AppState): Promise<string> => {
    if (!userId) throw new Error("User is not authenticated.");
    try {
        const sanitizedState = removeUndefinedValues(state);
        const userSessionsCollection = collection(db, USERS_COLLECTION, userId, SESSIONS_COLLECTION);
        const docRef = await addDoc(userSessionsCollection, {
            ...sanitizedState,
            timestamp: serverTimestamp(),
            ownerId: userId,
        });
        return docRef.id;
    } catch (e) {
        console.error("Error creating new session document: ", e);
        throw new Error("Failed to create a new session in Firestore.");
    }
};

/**
 * Updates an existing session document in Firestore.
 * @param userId The UID of the authenticated user.
 * @param sessionId The ID of the session document to update.
 * @param state The current application state to save.
 */
export const updateSession = async (userId: string, sessionId: string, state: AppState): Promise<void> => {
    if (!userId) throw new Error("User is not authenticated.");
    if (!sessionId) throw new Error("No session is currently active.");
    try {
        const sanitizedState = removeUndefinedValues(state);
        const sessionDocRef = doc(db, USERS_COLLECTION, userId, SESSIONS_COLLECTION, sessionId);
        // Using setDoc with merge: true is safer as it won't overwrite fields that
        // might be handled server-side (like a server timestamp on creation).
        await setDoc(sessionDocRef, {
            ...sanitizedState,
            lastUpdated: serverTimestamp(),
        }, { merge: true });
    } catch (e) {
        console.error(`Error updating document (${sessionId}): `, e);
        if (e instanceof Error && e.message.includes('Missing or insufficient permissions')) {
            throw new Error("Firestore Error: Missing or insufficient permissions. Please check your security rules.");
        }
        throw new Error("Failed to update session in Firestore.");
    }
};


export const getSavedSessions = async (userId: string): Promise<SavedSession[]> => {
  if (!userId) throw new Error("User is not authenticated.");
  try {
    const sessionsCollectionRef = collection(db, USERS_COLLECTION, userId, SESSIONS_COLLECTION);
    const q = query(sessionsCollectionRef, orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    const sessions: SavedSession[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      sessions.push({
        id: doc.id,
        timestamp: (data.timestamp as Timestamp)?.toDate() || new Date(),
        taskCount: data.tasks?.length || 0,
      });
    });
    return sessions;
  } catch (e) {
    console.error("Error getting documents: ", e);
    if (e instanceof Error && e.message.includes('Missing or insufficient permissions')) {
        throw new Error("Firestore Error: Missing or insufficient permissions. Please check your security rules.");
    }
    throw new Error("Failed to fetch saved sessions from Firestore.");
  }
};

export const loadSessionFromFirestore = async (userId: string, sessionId: string): Promise<AppState> => {
  if (!userId) throw new Error("User is not authenticated.");
  try {
    const docRef = doc(db, USERS_COLLECTION, userId, SESSIONS_COLLECTION, sessionId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      
      const logsWithDates = (data.logs || []).map((log: any) => ({
          ...log,
          timestamp: (log.timestamp as Timestamp)?.toDate ? (log.timestamp as Timestamp).toDate() : new Date(log.timestamp)
      }));

      return {
          tasks: data.tasks || [],
          approvals: data.approvals || [],
          logs: logsWithDates,
          agentStatus: data.agentStatus || {},
          agentWork: data.agentWork || {},
          isStarted: data.isStarted || false,
      };
    } else {
      throw new Error("No such session found!");
    }
  } catch (e) {
    console.error("Error loading document: ", e);
    throw new Error(`Failed to load session ${sessionId}.`);
  }
};

/**
 * Deletes a specific session document from Firestore for a user.
 * @param userId The UID of the authenticated user.
 * @param sessionId The ID of the session document to delete.
 */
export const deleteSession = async (userId: string, sessionId: string): Promise<void> => {
    if (!userId) throw new Error("User is not authenticated.");
    if (!sessionId) throw new Error("Session ID is required to delete.");
    try {
        const sessionDocRef = doc(db, USERS_COLLECTION, userId, SESSIONS_COLLECTION, sessionId);
        await deleteDoc(sessionDocRef);
    } catch (e) {
        console.error(`Error deleting document (${sessionId}): `, e);
        throw new Error("Failed to delete session from Firestore.");
    }
};
