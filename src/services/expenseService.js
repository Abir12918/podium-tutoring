import {
  collection,
  addDoc,
  setDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

const MONTHLY_EXPENSES_COLLECTION = 'monthlyExpenses';

export const EXPENSE_CATEGORIES = [
  'Rent',
  'Ads Budget',
  'Aka',
  'Krittika',
  'Akash/Saket',
  'Tutor Pay',
  'Software',
  'Supplies',
  'Marketing',
  'Utilities',
  'Refunds',
  'Other',
];

export const DEFAULT_MONTHLY_EXPENSES = [
  { defaultKey: 'rent', category: 'Rent', amount: 750 },
  { defaultKey: 'ads-budget', category: 'Ads Budget', amount: 300 },
  { defaultKey: 'aka', category: 'Aka', amount: 100 },
  { defaultKey: 'krittika', category: 'Krittika', amount: 100 },
  { defaultKey: 'akash-saket', category: 'Akash/Saket', amount: 100 },
];

const EXPENSE_UPDATE_FIELDS = [
  'monthKey',
  'category',
  'amount',
  'note',
  'updatedBy',
];

const assertMonthKey = (monthKey) => {
  if (typeof monthKey !== 'string' || !/^\d{4}-\d{2}$/.test(monthKey)) {
    throw new Error('monthKey must use YYYY-MM format.');
  }

  return monthKey;
};

const assertYear = (year) => {
  const normalizedYear = Number(year);

  if (!Number.isInteger(normalizedYear) || normalizedYear < 1000 || normalizedYear > 9999) {
    throw new Error('year must be a four-digit year.');
  }

  return normalizedYear;
};

const assertCategory = (category) => {
  if (typeof category !== 'string' || category.trim() === '') {
    throw new Error('category is required.');
  }

  return category.trim();
};

const assertAmount = (amount) => {
  const normalizedAmount = Number(amount);

  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new Error('amount must be greater than 0.');
  }

  return normalizedAmount;
};

const normalizeNote = (note) => (typeof note === 'string' ? note.trim() : '');

const buildExpensePayload = (expenseData) => {
  const createdBy = expenseData.createdBy || 'system';

  return {
    monthKey: assertMonthKey(expenseData.monthKey),
    category: assertCategory(expenseData.category),
    amount: assertAmount(expenseData.amount),
    note: normalizeNote(expenseData.note),
    isDefault: expenseData.isDefault === true,
    defaultKey: expenseData.defaultKey || '',
    isDeleted: false,
    createdBy,
    updatedBy: expenseData.updatedBy || createdBy,
  };
};

const buildExpenseUpdatePayload = (updatedData) => {
  const unknownFields = Object.keys(updatedData).filter(
    (fieldName) => !EXPENSE_UPDATE_FIELDS.includes(fieldName) && fieldName !== 'id' && fieldName !== 'createdAt' && fieldName !== 'createdBy'
  );

  if (unknownFields.length > 0) {
    throw new Error(`Unsupported monthly expense field(s): ${unknownFields.join(', ')}.`);
  }

  const updatePayload = {};

  if (Object.prototype.hasOwnProperty.call(updatedData, 'monthKey')) {
    updatePayload.monthKey = assertMonthKey(updatedData.monthKey);
  }

  if (Object.prototype.hasOwnProperty.call(updatedData, 'category')) {
    updatePayload.category = assertCategory(updatedData.category);
  }

  if (Object.prototype.hasOwnProperty.call(updatedData, 'amount')) {
    updatePayload.amount = assertAmount(updatedData.amount);
  }

  if (Object.prototype.hasOwnProperty.call(updatedData, 'note')) {
    updatePayload.note = normalizeNote(updatedData.note);
  }

  if (Object.prototype.hasOwnProperty.call(updatedData, 'updatedBy')) {
    updatePayload.updatedBy = updatedData.updatedBy || 'system';
  }

  return {
    ...updatePayload,
    updatedAt: Timestamp.now(),
  };
};

export const addMonthlyExpense = async (expenseData) => {
  try {
    const now = Timestamp.now();
    const expense = {
      ...buildExpensePayload(expenseData),
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, MONTHLY_EXPENSES_COLLECTION), expense);
    return { id: docRef.id, ...expense };
  } catch (error) {
    console.error("Error adding monthly expense:", error);
    throw error;
  }
};

export const getExpensesByMonth = async (monthKey) => {
  try {
    const normalizedMonthKey = assertMonthKey(monthKey);
    const expensesQuery = query(
      collection(db, MONTHLY_EXPENSES_COLLECTION),
      where('monthKey', '==', normalizedMonthKey)
    );
    const querySnapshot = await getDocs(expensesQuery);
    const expenses = [];

    querySnapshot.forEach((expenseDoc) => {
      expenses.push({ id: expenseDoc.id, ...expenseDoc.data() });
    });

    return expenses.filter((expense) => expense.isDeleted !== true);
  } catch (error) {
    console.error("Error fetching monthly expenses:", error);
    throw error;
  }
};

export const getExpensesByYear = async (year) => {
  try {
    const normalizedYear = assertYear(year);
    const yearStart = `${normalizedYear}-01`;
    const yearEnd = `${normalizedYear}-12`;
    const expensesQuery = query(
      collection(db, MONTHLY_EXPENSES_COLLECTION),
      where('monthKey', '>=', yearStart),
      where('monthKey', '<=', yearEnd)
    );
    const querySnapshot = await getDocs(expensesQuery);
    const expenses = [];

    querySnapshot.forEach((expenseDoc) => {
      expenses.push({ id: expenseDoc.id, ...expenseDoc.data() });
    });

    return expenses.filter((expense) => expense.isDeleted !== true);
  } catch (error) {
    console.error("Error fetching yearly expenses:", error);
    throw error;
  }
};

export const updateMonthlyExpense = async (expenseId, updatedData) => {
  try {
    if (!expenseId) {
      throw new Error('expenseId is required.');
    }

    const docRef = doc(db, MONTHLY_EXPENSES_COLLECTION, expenseId);
    const dataToUpdate = buildExpenseUpdatePayload(updatedData);

    await updateDoc(docRef, dataToUpdate);
    return true;
  } catch (error) {
    console.error("Error updating monthly expense:", error);
    throw error;
  }
};

export const deleteMonthlyExpense = async (expenseId) => {
  try {
    if (!expenseId) {
      throw new Error('expenseId is required.');
    }

    const docRef = doc(db, MONTHLY_EXPENSES_COLLECTION, expenseId);
    const expenseSnapshot = await getDoc(docRef);

    if (expenseSnapshot.exists() && expenseSnapshot.data()?.isDefault === true) {
      await updateDoc(docRef, {
        isDeleted: true,
        updatedAt: Timestamp.now(),
      });
      return true;
    }

    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error deleting monthly expense:", error);
    throw error;
  }
};

export const calculateExpenseTotal = (expenses = []) => (
  expenses
    .filter((expense) => expense?.isDeleted !== true)
    .reduce((total, expense) => total + (Number(expense.amount) || 0), 0)
);

export const ensureDefaultMonthlyExpenses = async (monthKey, userName = 'system') => {
  try {
    const normalizedMonthKey = assertMonthKey(monthKey);
    const expensesQuery = query(
      collection(db, MONTHLY_EXPENSES_COLLECTION),
      where('monthKey', '==', normalizedMonthKey)
    );
    const querySnapshot = await getDocs(expensesQuery);
    const existingDefaultKeys = new Set();

    querySnapshot.forEach((expenseDoc) => {
      const expense = expenseDoc.data();

      if (expense.isDefault === true && expense.defaultKey) {
        existingDefaultKeys.add(expense.defaultKey);
      }
    });

    const now = Timestamp.now();
    const missingDefaults = DEFAULT_MONTHLY_EXPENSES.filter((expense) => !existingDefaultKeys.has(expense.defaultKey));

    await Promise.all(missingDefaults.map((expense) => {
      const docId = `${normalizedMonthKey}_${expense.defaultKey}`;
      const docRef = doc(db, MONTHLY_EXPENSES_COLLECTION, docId);

      return setDoc(docRef, {
        monthKey: normalizedMonthKey,
        category: expense.category,
        amount: expense.amount,
        note: '',
        isDefault: true,
        defaultKey: expense.defaultKey,
        isDeleted: false,
        createdBy: userName,
        updatedBy: userName,
        createdAt: now,
        updatedAt: now,
      });
    }));

    return missingDefaults.length;
  } catch (error) {
    console.error("Error ensuring default monthly expenses:", error);
    throw error;
  }
};
