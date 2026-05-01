import { collection, doc, setDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { getStudents } from './studentService';

const TUITION_COLLECTION = 'tuitionRecords';

/**
 * Retrieves all tuition records for a specific month.
 * @param {string} monthKey - YYYY-MM format
 */
export const getTuitionRecordsForMonth = async (monthKey) => {
  try {
    const q = query(
      collection(db, TUITION_COLLECTION),
      where('monthKey', '==', monthKey)
    );
    const querySnapshot = await getDocs(q);
    const records = [];
    querySnapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() });
    });
    return records;
  } catch (error) {
    console.error("Error fetching tuition records:", error);
    throw error;
  }
};

/**
 * Saves or updates a single tuition record.
 * @param {Object} record
 */
export const saveTuitionRecord = async (record) => {
  try {
    const docId = `${record.studentId}_${record.monthKey}`;
    const docRef = doc(db, TUITION_COLLECTION, docId);

    const tuitionData = {
      studentId: record.studentId,
      studentName: record.studentName,
      studentType: record.studentType,
      monthKey: record.monthKey,
      expectedAmount: Number(record.expectedAmount) || 0,
      paidAmount: Number(record.paidAmount) || 0,
      paymentStatus: record.paymentStatus || 'unpaid',
      paymentDate: record.paymentDate || '',
      paymentMethod: record.paymentMethod || '',
      note: record.note || '',
      updatedAt: Timestamp.now(),
    };

    // Use setDoc with merge to preserve createdAt on existing documents
    await setDoc(docRef, {
      ...tuitionData,
      createdAt: Timestamp.now(),
    }, { merge: true });

    return { id: docId, ...tuitionData };
  } catch (error) {
    console.error("Error saving tuition record:", error);
    throw error;
  }
};

/**
 * Generates initial tuition records for all active students for a given month.
 * Skips students that already have a record for this month.
 * @param {string} monthKey - YYYY-MM format
 */
export const generateTuitionRecordsForMonth = async (monthKey) => {
  try {
    // 1. Fetch all students and filter for active ones
    const allStudents = await getStudents();
    const activeStudents = allStudents.filter(student => student.status === 'active');

    // 2. Fetch existing records for this month to avoid duplicates
    const existingRecords = await getTuitionRecordsForMonth(monthKey);
    const existingIds = new Set(existingRecords.map(record => record.studentId));

    // 3. Generate missing records
    const generatedRecords = [];
    
    // We use Promise.all to map over the active students and create records simultaneously
    const promises = activeStudents.map(async (student) => {
      if (!existingIds.has(student.id)) {
        const newRecord = {
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          studentType: student.studentType || 'center',
          monthKey: monthKey,
          expectedAmount: Number(student.monthlyTuition) || 0,
          paidAmount: 0,
          paymentStatus: 'unpaid',
          paymentDate: '',
          paymentMethod: '',
          note: '',
        };
        const saved = await saveTuitionRecord(newRecord);
        generatedRecords.push(saved);
      }
    });

    await Promise.all(promises);

    return generatedRecords;
  } catch (error) {
    console.error("Error generating tuition records:", error);
    throw error;
  }
};
