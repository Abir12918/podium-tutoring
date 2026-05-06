import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { getStudents } from './studentService';

const TUITION_COLLECTION = 'tuitionRecords';

const normalizeOptionalNumber = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

export const calculateHourlyRate = (expectedAmount, expectedTutoringHours) => {
  const amount = Number(expectedAmount) || 0;
  const hours = normalizeOptionalNumber(expectedTutoringHours);

  if (!hours || hours <= 0) {
    return null;
  }

  return amount / hours;
};

export const calculateEarnedAmount = (completedTutoringHours, hourlyRate) => {
  const completedHours = normalizeOptionalNumber(completedTutoringHours);
  const rate = normalizeOptionalNumber(hourlyRate);

  if (completedHours === null || rate === null) {
    return null;
  }

  return completedHours * rate;
};

export const calculateExpectedTutorExpense = (expectedTutoringHours, tutorHourlyPay) => {
  const expectedHours = normalizeOptionalNumber(expectedTutoringHours);
  const hourlyPay = normalizeOptionalNumber(tutorHourlyPay);

  if (!expectedHours || expectedHours <= 0 || !hourlyPay || hourlyPay <= 0) {
    return null;
  }

  return expectedHours * hourlyPay;
};

export const calculateTutorExpense = (completedTutoringHours, tutorHourlyPay) => {
  const completedHours = normalizeOptionalNumber(completedTutoringHours);
  const hourlyPay = normalizeOptionalNumber(tutorHourlyPay);

  if (completedHours === null || !hourlyPay || hourlyPay <= 0) {
    return null;
  }

  return completedHours * hourlyPay;
};

export const calculateProfit = (revenue, expense) => {
  const normalizedRevenue = normalizeOptionalNumber(revenue);
  const normalizedExpense = normalizeOptionalNumber(expense);

  if (normalizedRevenue === null || normalizedExpense === null) {
    return null;
  }

  return normalizedRevenue - normalizedExpense;
};

export const calculatePaymentStatus = (paidAmount, expectedAmount) => {
  const paid = Number(paidAmount) || 0;
  const expected = Number(expectedAmount) || 0;

  if (paid <= 0) {
    return 'unpaid';
  }

  if (paid >= expected) {
    return 'paid';
  }

  return 'partial';
};

export const isRecordPaused = (record) => record?.isPaused === true;

export const filterActiveTuitionRecords = (records) => (
  Array.isArray(records) ? records.filter(record => !isRecordPaused(record)) : []
);

const getExistingPauseFields = async (docRef) => {
  const existingSnapshot = await getDoc(docRef);

  if (!existingSnapshot.exists()) {
    return {
      isPaused: false,
    };
  }

  const existingRecord = existingSnapshot.data();

  return {
    isPaused: isRecordPaused(existingRecord),
    pauseReason: existingRecord.pauseReason || '',
    pauseNote: existingRecord.pauseNote || '',
    pausedAt: existingRecord.pausedAt || null,
    pausedBy: existingRecord.pausedBy || '',
    resumedAt: existingRecord.resumedAt || null,
    resumedBy: existingRecord.resumedBy || '',
  };
};

export const pauseTuitionRecord = async (recordId, pauseData = {}) => {
  try {
    const docRef = doc(db, TUITION_COLLECTION, recordId);
    const pausedAt = pauseData.pausedAt || Timestamp.now();
    const pauseUpdate = {
      isPaused: true,
      pauseReason: pauseData.pauseReason || '',
      pauseNote: pauseData.pauseNote || '',
      pausedAt,
      pausedBy: pauseData.pausedBy || '',
      updatedAt: Timestamp.now(),
    };

    await updateDoc(docRef, pauseUpdate);

    return { id: recordId, ...pauseUpdate };
  } catch (error) {
    console.error("Error pausing tuition record:", error);
    throw error;
  }
};

export const resumeTuitionRecord = async (recordId, resumeData = {}) => {
  try {
    const docRef = doc(db, TUITION_COLLECTION, recordId);
    const resumedAt = resumeData.resumedAt || Timestamp.now();
    const resumeUpdate = {
      isPaused: false,
      resumedAt,
      resumedBy: resumeData.resumedBy || '',
      updatedAt: Timestamp.now(),
    };

    await updateDoc(docRef, resumeUpdate);

    return { id: recordId, ...resumeUpdate };
  } catch (error) {
    console.error("Error resuming tuition record:", error);
    throw error;
  }
};

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
    const pauseFields = await getExistingPauseFields(docRef);
    const studentType = record.studentType || 'center';
    const tuitionType = record.tuitionType || (studentType === 'one-on-one' ? 'hourly' : 'monthly');
    const expectedAmount = Number(record.expectedAmount) || 0;
    const paidAmount = Number(record.paidAmount) || 0;
    const expectedTutoringHours = normalizeOptionalNumber(record.expectedTutoringHours);
    const completedTutoringHours = normalizeOptionalNumber(record.completedTutoringHours);
    const hourlyRate = calculateHourlyRate(expectedAmount, expectedTutoringHours);
    const earnedAmount = calculateEarnedAmount(completedTutoringHours, hourlyRate);
    const tutorHourlyPay = normalizeOptionalNumber(record.tutorHourlyPay);
    const expectedTutorExpense = calculateExpectedTutorExpense(expectedTutoringHours, tutorHourlyPay);
    const calculatedTutorExpense = calculateTutorExpense(completedTutoringHours, tutorHourlyPay);
    const tutorExpense = record.tutorExpense === '' || record.tutorExpense === null || record.tutorExpense === undefined
      ? calculatedTutorExpense
      : normalizeOptionalNumber(record.tutorExpense);
    const expectedProfit = calculateProfit(expectedAmount, expectedTutorExpense);
    const earnedProfit = calculateProfit(earnedAmount, tutorExpense);

    const tuitionData = {
      studentId: record.studentId,
      studentName: record.studentName,
      studentType,
      tuitionType,
      monthKey: record.monthKey,
      expectedAmount,
      paidAmount,
      paymentStatus: calculatePaymentStatus(paidAmount, expectedAmount),
      paymentDate: record.paymentDate || '',
      paymentMethod: record.paymentMethod || '',
      note: record.note || '',
      ...pauseFields,
      updatedAt: Timestamp.now(),
    };

    if (tuitionType === 'hourly') {
      tuitionData.expectedTutoringHours = expectedTutoringHours;
      tuitionData.completedTutoringHours = completedTutoringHours;
      tuitionData.hourlyRate = hourlyRate;
      tuitionData.earnedAmount = earnedAmount;
      tuitionData.tutorName = record.tutorName?.trim() || '';
      tuitionData.tutorHourlyPay = tutorHourlyPay;
      tuitionData.expectedTutorExpense = expectedTutorExpense;
      tuitionData.tutorExpense = tutorExpense;
      tuitionData.expectedProfit = expectedProfit;
      tuitionData.earnedProfit = earnedProfit;
    }

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
 * Generates initial tuition records for active students for a given month.
 * Skips students that already have a record for this month.
 * @param {string} monthKey - YYYY-MM format
 * @param {'center'|'one-on-one'} [targetStudentType]
 */
export const generateTuitionRecordsForMonth = async (monthKey, targetStudentType) => {
  try {
    // 1. Fetch all students and filter for active ones
    const allStudents = await getStudents();
    const activeStudents = allStudents.filter(student => (
      student.status === 'active'
      && (!targetStudentType || student.studentType === targetStudentType)
    ));

    // 2. Fetch existing records for this month to avoid duplicates
    const existingRecords = await getTuitionRecordsForMonth(monthKey);
    const existingIds = new Set(existingRecords.map(record => record.studentId));

    // 3. Generate missing records
    const generatedRecords = [];
    
    // We use Promise.all to map over the active students and create records simultaneously
    const promises = activeStudents.map(async (student) => {
      if (!existingIds.has(student.id)) {
        const studentType = student.studentType || 'center';
        const tuitionType = studentType === 'one-on-one' ? 'hourly' : 'monthly';
        const newRecord = {
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          studentType,
          tuitionType,
          monthKey: monthKey,
          expectedAmount: Number(student.monthlyTuition) || 0,
          ...(studentType === 'one-on-one' ? {
            expectedTutoringHours: normalizeOptionalNumber(student.expectedMonthlyTutoringHours),
            tutorName: student.assignedTutorName || '',
            tutorHourlyPay: normalizeOptionalNumber(student.tutorHourlyPay),
          } : {}),
          paidAmount: 0,
          paymentStatus: 'unpaid',
          paymentDate: '',
          paymentMethod: '',
          note: '',
          isPaused: false,
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
