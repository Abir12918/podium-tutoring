import { collection, doc, setDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

const ATTENDANCE_COLLECTION = 'attendance';

/**
 * Fetches all attendance records for a specific month.
 * @param {string} monthKey - The month key in YYYY-MM format.
 */
export const getAttendanceForMonth = async (monthKey) => {
  try {
    const q = query(
      collection(db, ATTENDANCE_COLLECTION),
      where('monthKey', '==', monthKey)
    );
    const querySnapshot = await getDocs(q);
    const records = [];
    querySnapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() });
    });
    return records;
  } catch (error) {
    console.error("Error fetching attendance:", error);
    throw error;
  }
};

/**
 * Saves or updates a single attendance record.
 * @param {Object} record
 * @param {string} record.studentId
 * @param {string} record.studentName
 * @param {string} record.date - YYYY-MM-DD
 * @param {string} record.monthKey - YYYY-MM
 * @param {string} record.status - "present" or "absent"
 * @param {string} record.note
 * @param {string} record.studentType - usually "center"
 * @param {string} record.markedBy
 */
export const saveAttendanceRecord = async (record) => {
  try {
    // Expected document ID format: studentId_YYYY-MM-DD
    const docId = `${record.studentId}_${record.date}`;
    const docRef = doc(db, ATTENDANCE_COLLECTION, docId);

    const attendanceData = {
      studentId: record.studentId,
      studentName: record.studentName,
      date: record.date,
      monthKey: record.monthKey,
      status: record.status,
      note: record.note || '',
      studentType: record.studentType || 'center',
      markedBy: record.markedBy || 'system',
      updatedAt: Timestamp.now(),
    };

    await setDoc(docRef, {
      ...attendanceData,
      createdAt: Timestamp.now()
    }, { merge: true });

    return { id: docId, ...attendanceData };
  } catch (error) {
    console.error("Error saving attendance record:", error);
    throw error;
  }
};
