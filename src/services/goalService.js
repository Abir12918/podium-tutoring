import { collection, addDoc, getDocs, doc, getDoc, updateDoc, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

const GOALS_COLLECTION = 'goals';
const MAX_GOALS_PER_QUARTER = 5;

const VALID_QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const VALID_OWNERS = ['Abir', 'Rahat', 'Both'];
const VALID_PRIORITIES = ['P0', 'P1', 'P2'];
const VALID_STATUSES = ['Not Started', 'In Progress', 'Done', 'Blocked'];
const GOAL_UPDATE_FIELDS = [
  'goalDescription',
  'quarter',
  'year',
  'owner',
  'priority',
  'progress',
  'startDate',
  'endDate',
  'status',
  'notes',
  'createdBy',
  'updatedBy',
];

const assertAllowedValue = (fieldName, value, allowedValues) => {
  if (!allowedValues.includes(value)) {
    throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}.`);
  }
};

const normalizeYear = (year) => {
  const normalizedYear = Number(year);

  if (!Number.isInteger(normalizedYear)) {
    throw new Error('year must be an integer.');
  }

  return normalizedYear;
};

const normalizeProgress = (progress) => {
  const normalizedProgress = Number(progress);

  if (Number.isNaN(normalizedProgress) || normalizedProgress < 0 || normalizedProgress > 100) {
    throw new Error('progress must be a number from 0 to 100.');
  }

  return normalizedProgress;
};

const validateQuarterAndYear = (year, quarter) => {
  const normalizedYear = normalizeYear(year);
  assertAllowedValue('quarter', quarter, VALID_QUARTERS);

  return {
    year: normalizedYear,
    quarter,
  };
};

const buildGoalPayload = (goalData) => {
  assertAllowedValue('quarter', goalData.quarter, VALID_QUARTERS);
  assertAllowedValue('owner', goalData.owner, VALID_OWNERS);
  assertAllowedValue('priority', goalData.priority, VALID_PRIORITIES);
  assertAllowedValue('status', goalData.status, VALID_STATUSES);

  return {
    goalDescription: goalData.goalDescription || '',
    quarter: goalData.quarter,
    year: normalizeYear(goalData.year),
    owner: goalData.owner,
    priority: goalData.priority,
    progress: normalizeProgress(goalData.progress),
    startDate: goalData.startDate || '',
    endDate: goalData.endDate || '',
    status: goalData.status,
    notes: goalData.notes || '',
    createdBy: goalData.createdBy || 'system',
    updatedBy: goalData.updatedBy || goalData.createdBy || 'system',
  };
};

const buildGoalUpdatePayload = (updatedData) => {
  const updatePayload = { ...updatedData };
  const unknownFields = Object.keys(updatePayload).filter(
    (fieldName) => !GOAL_UPDATE_FIELDS.includes(fieldName) && fieldName !== 'id' && fieldName !== 'createdAt'
  );

  if (unknownFields.length > 0) {
    throw new Error(`Unsupported goal field(s): ${unknownFields.join(', ')}.`);
  }

  if (Object.prototype.hasOwnProperty.call(updatePayload, 'quarter')) {
    assertAllowedValue('quarter', updatePayload.quarter, VALID_QUARTERS);
  }

  if (Object.prototype.hasOwnProperty.call(updatePayload, 'year')) {
    updatePayload.year = normalizeYear(updatePayload.year);
  }

  if (Object.prototype.hasOwnProperty.call(updatePayload, 'owner')) {
    assertAllowedValue('owner', updatePayload.owner, VALID_OWNERS);
  }

  if (Object.prototype.hasOwnProperty.call(updatePayload, 'priority')) {
    assertAllowedValue('priority', updatePayload.priority, VALID_PRIORITIES);
  }

  if (Object.prototype.hasOwnProperty.call(updatePayload, 'status')) {
    assertAllowedValue('status', updatePayload.status, VALID_STATUSES);
  }

  if (Object.prototype.hasOwnProperty.call(updatePayload, 'progress')) {
    updatePayload.progress = normalizeProgress(updatePayload.progress);
  }

  delete updatePayload.id;
  delete updatePayload.createdAt;

  return {
    ...updatePayload,
    updatedAt: Timestamp.now(),
  };
};

/**
 * Retrieves goals for a specific quarter and year.
 * Completed goals are included because no status filter is applied.
 */
export const getGoalsByQuarter = async (year, quarter) => {
  try {
    const validated = validateQuarterAndYear(year, quarter);
    const q = query(
      collection(db, GOALS_COLLECTION),
      where('year', '==', validated.year),
      where('quarter', '==', validated.quarter)
    );
    const querySnapshot = await getDocs(q);
    const goals = [];

    querySnapshot.forEach((goalDoc) => {
      goals.push({ id: goalDoc.id, ...goalDoc.data() });
    });

    return goals;
  } catch (error) {
    console.error("Error fetching goals by quarter:", error);
    throw error;
  }
};

export const getGoalCountByQuarter = async (year, quarter) => {
  try {
    const goals = await getGoalsByQuarter(year, quarter);
    return goals.length;
  } catch (error) {
    console.error("Error getting goal count by quarter:", error);
    throw error;
  }
};

export const validateQuarterGoalLimit = async (year, quarter) => {
  try {
    const count = await getGoalCountByQuarter(year, quarter);
    return count < MAX_GOALS_PER_QUARTER;
  } catch (error) {
    console.error("Error validating quarter goal limit:", error);
    throw error;
  }
};

export const addGoal = async (goalData) => {
  try {
    const goal = buildGoalPayload(goalData);
    const canAddGoal = await validateQuarterGoalLimit(goal.year, goal.quarter);

    if (!canAddGoal) {
      throw new Error(`Cannot add more than ${MAX_GOALS_PER_QUARTER} goals for ${goal.quarter} ${goal.year}.`);
    }

    const goalWithTimestamps = {
      ...goal,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, GOALS_COLLECTION), goalWithTimestamps);
    return { id: docRef.id, ...goalWithTimestamps };
  } catch (error) {
    console.error("Error adding goal:", error);
    throw error;
  }
};

export const updateGoal = async (goalId, updatedData) => {
  try {
    const docRef = doc(db, GOALS_COLLECTION, goalId);
    const dataToUpdate = buildGoalUpdatePayload(updatedData);
    const currentGoalSnap = await getDoc(docRef);

    if (!currentGoalSnap.exists()) {
      throw new Error('Goal not found.');
    }

    const currentGoal = currentGoalSnap.data();
    const targetYear = dataToUpdate.year || currentGoal.year;
    const targetQuarter = dataToUpdate.quarter || currentGoal.quarter;
    const isMovingQuarter = targetYear !== currentGoal.year || targetQuarter !== currentGoal.quarter;

    if (isMovingQuarter) {
      const canMoveGoal = await validateQuarterGoalLimit(targetYear, targetQuarter);

      if (!canMoveGoal) {
        throw new Error(`Cannot add more than ${MAX_GOALS_PER_QUARTER} goals for ${targetQuarter} ${targetYear}.`);
      }
    }

    await updateDoc(docRef, dataToUpdate);
    return true;
  } catch (error) {
    console.error("Error updating goal:", error);
    throw error;
  }
};
