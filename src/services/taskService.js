import { collection, addDoc, getDocs, doc, updateDoc, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { getMonthKeyFromDate } from '../utils/taskUtils';

const TASKS_COLLECTION = 'tasks';

const VALID_OWNERS = ['Abir', 'Rahat', 'Both'];
const VALID_PRIORITIES = ['High', 'Medium', 'Low'];
const VALID_STATUSES = ['To Do', 'In Progress', 'Done', 'Blocked'];
const TASK_UPDATE_FIELDS = [
  'title',
  'description',
  'owner',
  'priority',
  'status',
  'dueDate',
  'notes',
  'createdBy',
  'updatedBy',
];

const assertAllowedValue = (fieldName, value, allowedValues) => {
  if (!allowedValues.includes(value)) {
    throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}.`);
  }
};

const assertRequiredString = (fieldName, value) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldName} is required.`);
  }

  return value.trim();
};

const buildTaskPayload = (taskData) => {
  const title = assertRequiredString('title', taskData.title);
  const dueDate = assertRequiredString('dueDate', taskData.dueDate);
  const owner = taskData.owner || 'Both';
  const priority = taskData.priority || 'Medium';
  const status = taskData.status || 'To Do';

  assertAllowedValue('owner', owner, VALID_OWNERS);
  assertAllowedValue('priority', priority, VALID_PRIORITIES);
  assertAllowedValue('status', status, VALID_STATUSES);

  return {
    title,
    description: taskData.description || '',
    owner,
    priority,
    status,
    dueDate,
    monthKey: getMonthKeyFromDate(dueDate),
    notes: taskData.notes || '',
    createdBy: taskData.createdBy || 'system',
    updatedBy: taskData.updatedBy || taskData.createdBy || 'system',
    completedAt: status === 'Done' ? Timestamp.now() : null,
  };
};

const buildTaskUpdatePayload = (updatedData) => {
  const updatePayload = { ...updatedData };
  const unknownFields = Object.keys(updatePayload).filter(
    (fieldName) => !TASK_UPDATE_FIELDS.includes(fieldName) && fieldName !== 'id' && fieldName !== 'createdAt' && fieldName !== 'monthKey' && fieldName !== 'completedAt'
  );

  if (unknownFields.length > 0) {
    throw new Error(`Unsupported task field(s): ${unknownFields.join(', ')}.`);
  }

  delete updatePayload.id;
  delete updatePayload.createdAt;
  delete updatePayload.monthKey;
  delete updatePayload.completedAt;

  if (Object.prototype.hasOwnProperty.call(updatePayload, 'title')) {
    updatePayload.title = assertRequiredString('title', updatePayload.title);
  }

  if (Object.prototype.hasOwnProperty.call(updatePayload, 'dueDate')) {
    updatePayload.dueDate = assertRequiredString('dueDate', updatePayload.dueDate);
    updatePayload.monthKey = getMonthKeyFromDate(updatePayload.dueDate);
  }

  if (Object.prototype.hasOwnProperty.call(updatePayload, 'owner')) {
    assertAllowedValue('owner', updatePayload.owner, VALID_OWNERS);
  }

  if (Object.prototype.hasOwnProperty.call(updatePayload, 'priority')) {
    assertAllowedValue('priority', updatePayload.priority, VALID_PRIORITIES);
  }

  if (Object.prototype.hasOwnProperty.call(updatePayload, 'status')) {
    assertAllowedValue('status', updatePayload.status, VALID_STATUSES);
    updatePayload.completedAt = updatePayload.status === 'Done' ? Timestamp.now() : null;
  }

  return {
    ...updatePayload,
    updatedAt: Timestamp.now(),
  };
};

export const addTask = async (taskData) => {
  try {
    const task = buildTaskPayload(taskData);
    const now = Timestamp.now();
    const taskWithTimestamps = {
      ...task,
      createdAt: now,
      updatedAt: now,
      completedAt: task.status === 'Done' ? now : null,
    };

    const docRef = await addDoc(collection(db, TASKS_COLLECTION), taskWithTimestamps);
    return { id: docRef.id, ...taskWithTimestamps };
  } catch (error) {
    console.error("Error adding task:", error);
    throw error;
  }
};

export const getTasksByMonth = async (monthKey) => {
  try {
    const q = query(collection(db, TASKS_COLLECTION), where('monthKey', '==', monthKey));
    const querySnapshot = await getDocs(q);
    const tasks = [];

    querySnapshot.forEach((taskDoc) => {
      tasks.push({ id: taskDoc.id, ...taskDoc.data() });
    });

    return tasks;
  } catch (error) {
    console.error("Error fetching tasks by month:", error);
    throw error;
  }
};

export const getTasks = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, TASKS_COLLECTION));
    const tasks = [];

    querySnapshot.forEach((taskDoc) => {
      tasks.push({ id: taskDoc.id, ...taskDoc.data() });
    });

    return tasks;
  } catch (error) {
    console.error("Error getting tasks:", error);
    throw error;
  }
};

export const updateTask = async (taskId, updatedData) => {
  try {
    const docRef = doc(db, TASKS_COLLECTION, taskId);
    const dataToUpdate = buildTaskUpdatePayload(updatedData);

    await updateDoc(docRef, dataToUpdate);
    return true;
  } catch (error) {
    console.error("Error updating task:", error);
    throw error;
  }
};

export const markTaskDone = async (taskId) => {
  try {
    return await updateTask(taskId, { status: 'Done' });
  } catch (error) {
    console.error("Error marking task done:", error);
    throw error;
  }
};
