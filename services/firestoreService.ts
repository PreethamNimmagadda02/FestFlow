
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
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { AppState, SavedSession, UserProfile } from '../types';

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

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    if (!uid) return null;
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
    }
    return null;
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>): Promise<void> => {
    if (!uid) throw new Error("User UID is required to update profile.");
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    await setDoc(userDocRef, data, { merge: true });
};

/**
 * Creates a new session document in Firestore for a user.
 * @param userUid The UID of the authenticated user.
 * @param state The initial state of the application to save.
 * @param goal The user's event goal, used as the initial session name.
 * @returns The ID of the newly created session document.
 */
export const createSession = async (userUid: string, state: AppState, goal: string): Promise<string> => {
    if (!userUid) throw new Error("User is not authenticated.");
    try {
        const sanitizedState = removeUndefinedValues(state);
        const userSessionsCollection = collection(db, USERS_COLLECTION, userUid, SESSIONS_COLLECTION);
        const docRef = await addDoc(userSessionsCollection, {
            name: goal,
            ...sanitizedState,
            timestamp: serverTimestamp(),
            ownerId: userUid,
        });
        return docRef.id;
    } catch (e) {
        console.error("Error creating new session document: ", e);
        throw new Error("Failed to create a new session in Firestore.");
    }
};

/**
 * Updates an existing session document in Firestore.
 * @param userUid The UID of the authenticated user.
 * @param sessionId The ID of the session document to update.
 * @param state The current application state to save.
 * @param projectName The current name of the project.
 */
export const updateSession = async (userUid: string, sessionId: string, state: AppState, projectName: string | null): Promise<void> => {
    if (!userUid) throw new Error("User is not authenticated.");
    if (!sessionId) throw new Error("No session is currently active.");
    try {
        const sanitizedState = removeUndefinedValues(state);
        const sessionDocRef = doc(db, USERS_COLLECTION, userUid, SESSIONS_COLLECTION, sessionId);

        const dataToUpdate: Record<string, any> = {
            ...sanitizedState,
            lastUpdated: serverTimestamp(),
        };

        if (projectName) {
            dataToUpdate.name = projectName;
        }

        await setDoc(sessionDocRef, dataToUpdate, { merge: true });
    } catch (e) {
        console.error(`Error updating document (${sessionId}): `, e);
        if (e instanceof Error && e.message.includes('Missing or insufficient permissions')) {
            throw new Error("Firestore Error: Missing or insufficient permissions. Please check your security rules.");
        }
        throw new Error("Failed to update session in Firestore.");
    }
};

/**
 * Updates the name of a specific session document.
 * @param userUid The UID of the authenticated user.
 * @param sessionId The ID of the session to update.
 * @param newName The new name for the session.
 */
export const updateSessionName = async (userUid: string, sessionId: string, newName: string): Promise<void> => {
    if (!userUid) throw new Error("User is not authenticated.");
    if (!sessionId) throw new Error("Session ID is required.");
    if (!newName.trim()) throw new Error("Session name cannot be empty.");

    const sessionDocRef = doc(db, USERS_COLLECTION, userUid, SESSIONS_COLLECTION, sessionId);
    await updateDoc(sessionDocRef, {
        name: newName.trim()
    });
};

export const getSavedSessions = async (userUid: string): Promise<SavedSession[]> => {
  if (!userUid) throw new Error("User is not authenticated.");
  try {
    const sessionsCollectionRef = collection(db, USERS_COLLECTION, userUid, SESSIONS_COLLECTION);
    const q = query(sessionsCollectionRef, orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    const sessions: SavedSession[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as any;
      const timestamp = (data.timestamp as Timestamp)?.toDate() || new Date();
      sessions.push({
        id: doc.id,
        name: data.name || `Plan from ${timestamp.toLocaleString()}`,
        timestamp: timestamp,
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

export const loadSessionFromFirestore = async (userUid: string, sessionId: string): Promise<AppState> => {
  if (!userUid) throw new Error("User is not authenticated.");
  try {
    const docRef = doc(db, USERS_COLLECTION, userUid, SESSIONS_COLLECTION, sessionId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as any;
      
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
 * @param userUid The UID of the authenticated user.
 * @param sessionId The ID of the session document to delete.
 */
export const deleteSession = async (userUid: string, sessionId: string): Promise<void> => {
    if (!userUid) throw new Error("User is not authenticated.");
    if (!sessionId) throw new Error("Session ID is required to delete.");
    try {
        const sessionDocRef = doc(db, USERS_COLLECTION, userUid, SESSIONS_COLLECTION, sessionId);
        await deleteDoc(sessionDocRef);
    } catch (e) {
        console.error(`Error deleting document (${sessionId}): `, e);
        throw new Error("Failed to delete session from Firestore.");
    }
};
