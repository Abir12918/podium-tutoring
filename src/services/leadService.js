import { collection, addDoc, getDocs, doc, getDoc, updateDoc, Timestamp, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { buildLeadActivityPayload, buildLeadPayload, buildLeadUpdatePayload } from '../utils/leadUtils';

const LEADS_COLLECTION = 'leads';

/**
 * Adds a new lead to the Firestore database.
 * Required fields: studentName and parentPhone.
 */
export const addLead = async (leadData) => {
  try {
    const lead = buildLeadPayload(leadData);
    const now = Timestamp.now();
    const leadWithTimestamps = {
      ...lead,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, LEADS_COLLECTION), leadWithTimestamps);
    return { id: docRef.id, ...leadWithTimestamps };
  } catch (error) {
    console.error("Error adding lead:", error);
    throw error;
  }
};

/**
 * Retrieves all leads from Firestore.
 */
export const getLeads = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, LEADS_COLLECTION));
    const leads = [];

    querySnapshot.forEach((leadDoc) => {
      leads.push({ id: leadDoc.id, ...leadDoc.data() });
    });

    return leads;
  } catch (error) {
    console.error("Error getting leads:", error);
    throw error;
  }
};

/**
 * Retrieves a single lead by ID from Firestore.
 */
export const getLeadById = async (leadId) => {
  try {
    const docRef = doc(db, LEADS_COLLECTION, leadId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }

    return null;
  } catch (error) {
    console.error("Error getting lead:", error);
    throw error;
  }
};

/**
 * Updates a lead in Firestore.
 * activityLog updates must use addLeadActivity so the log remains append-only.
 */
export const updateLead = async (leadId, updatedData) => {
  try {
    const docRef = doc(db, LEADS_COLLECTION, leadId);
    const dataToUpdate = {
      ...buildLeadUpdatePayload(updatedData),
      updatedAt: Timestamp.now(),
    };

    await updateDoc(docRef, dataToUpdate);
    return true;
  } catch (error) {
    console.error("Error updating lead:", error);
    throw error;
  }
};

/**
 * Appends an activity entry to a lead without editing or deleting old entries.
 */
export const addLeadActivity = async (leadId, activityData) => {
  try {
    const docRef = doc(db, LEADS_COLLECTION, leadId);
    const now = Timestamp.now();
    const activity = buildLeadActivityPayload(activityData, now);

    await updateDoc(docRef, {
      activityLog: arrayUnion(activity),
      updatedAt: now,
      updatedBy: activity.createdBy,
    });

    return activity;
  } catch (error) {
    console.error("Error adding lead activity:", error);
    throw error;
  }
};
