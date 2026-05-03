import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

const STUDENTS_COLLECTION = 'students';

/**
 * Adds a new student to the Firestore database.
 * 
 * @param {Object} studentData
 * @param {string} studentData.firstName
 * @param {string} studentData.lastName
 * @param {string} studentData.school
 * @param {string} studentData.grade
 * @param {string[]} studentData.subjects
 * @param {string[]} studentData.studentEmails
 * @param {string[]} studentData.parentEmails
 * @param {string[]} studentData.parentPhones
 * @param {string} studentData.startDate
 * @param {number} studentData.monthlyTuition
 * @param {string} studentData.studentType - "center" or "one-on-one"
 * @param {string} studentData.centerClass - "Abir", "Rahat", or "Unassigned"
 * @param {string} studentData.notes
 * @param {string} studentData.status - default "active"
 */
export const addStudent = async (studentData) => {
  try {
    const studentType = studentData.studentType || 'center';
    const student = {
      firstName: studentData.firstName || '',
      lastName: studentData.lastName || '',
      school: studentData.school || '',
      grade: studentData.grade || '',
      subjects: studentData.subjects || [],
      studentEmails: studentData.studentEmails || [],
      parentEmails: studentData.parentEmails || [],
      parentPhones: studentData.parentPhones || [],
      startDate: studentData.startDate || new Date().toISOString(),
      monthlyTuition: studentData.monthlyTuition || 0,
      studentType,
      ...(studentType === 'center' ? { centerClass: studentData.centerClass || 'Unassigned' } : {}),
      notes: studentData.notes || '',
      status: studentData.status || 'active',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, STUDENTS_COLLECTION), student);
    return { id: docRef.id, ...student };
  } catch (error) {
    console.error("Error adding student:", error);
    throw error;
  }
};

/**
 * Retrieves all students from the Firestore database.
 * Excludes permanently hidden student IDs.
 */
const EXCLUDED_STUDENT_IDS = ['RMxCyOwVvNLZaKWROQcp', 'em3Wmb1Q92R7o5KN2jcc'];

export const getStudents = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, STUDENTS_COLLECTION));
    const students = [];
    querySnapshot.forEach((doc) => {
      if (!EXCLUDED_STUDENT_IDS.includes(doc.id)) {
        students.push({ id: doc.id, ...doc.data() });
      }
    });
    console.log(`Fetched ${students.length} students from ${STUDENTS_COLLECTION}`);
    return students;
  } catch (error) {
    console.error("Error getting students:", error);
    throw error;
  }
};

/**
 * Retrieves only active center students from Firestore.
 */
export const getCenterStudents = async () => {
  try {
    const q = query(
      collection(db, STUDENTS_COLLECTION),
      where('studentType', '==', 'center'),
      where('status', '==', 'active')
    );
    const querySnapshot = await getDocs(q);
    const students = [];
    querySnapshot.forEach((doc) => {
      if (!EXCLUDED_STUDENT_IDS.includes(doc.id)) {
        students.push({ id: doc.id, ...doc.data() });
      }
    });
    console.log(`Fetched ${students.length} active center students.`);
    return students;
  } catch (error) {
    console.error("Error getting center students:", error);
    throw error;
  }
};

/**
 * Retrieves a single student by ID from Firestore.
 * @param {string} studentId
 */
export const getStudentById = async (studentId) => {
  try {
    const docRef = doc(db, STUDENTS_COLLECTION, studentId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting student:", error);
    throw error;
  }
};

/**
 * Updates a student in Firestore.
 * @param {string} studentId
 * @param {Object} updateData
 */
export const updateStudent = async (studentId, updateData) => {
  try {
    const docRef = doc(db, STUDENTS_COLLECTION, studentId);
    
    // We update updatedAt timestamp
    const dataToUpdate = {
      ...updateData,
      updatedAt: Timestamp.now()
    };
    
    await updateDoc(docRef, dataToUpdate);
    return true;
  } catch (error) {
    console.error("Error updating student:", error);
    throw error;
  }
};

/**
 * Deletes a student from Firestore.
 * @param {string} studentId
 */
export const deleteStudent = async (studentId) => {
  try {
    const docRef = doc(db, STUDENTS_COLLECTION, studentId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error deleting student:", error);
    throw error;
  }
};
