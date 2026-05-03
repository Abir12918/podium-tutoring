export const LEAD_GRADES = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'College', 'Other'];

export const LEAD_SUBJECTS = ['State Test Prep', 'SHSAT', 'Regents', 'Common Core', 'Other'];

export const LEAD_SERVICE_INTERESTS = [
  'Center',
  'One-on-One In-Person',
  'One-on-One Remote',
  'Remote Group',
  'SAT',
  'State Test Prep',
  'Regents',
  'Other',
];

export const LEAD_SOURCES = ['Referral', 'Facebook', 'Walk-In', 'Friend/Family', 'Other'];

export const LEAD_OWNERS = ['Abir', 'Rahat', 'Both'];

export const LEAD_PRIORITIES = ['Hot', 'Warm', 'Cold'];

export const LEAD_STATUSES = [
  'New',
  'Reached Out',
  'Follow-Up Needed',
  'Trial Scheduled',
  'Converted',
  'Closed',
  'Not Interested',
];

export const LEAD_OBJECTIONS = [
  'Price too high',
  'Too many hours',
  'Not interested in remote',
  'Schedule conflict',
  'Needs to discuss with family',
  'Chose another tutor',
  'Not ready yet',
  'Other',
];

const LEAD_FIELDS = [
  'studentName',
  'grade',
  'subjects',
  'parentName',
  'parentPhone',
  'serviceInterests',
  'serviceInterestOtherNotes',
  'leadSource',
  'leadSourceOtherNotes',
  'owner',
  'priority',
  'status',
  'nextFollowUpDate',
  'lastContactedDate',
  'objection',
  'objectionOtherNotes',
  'generalNotes',
  'createdBy',
  'updatedBy',
];

export const LEAD_UPDATE_FIELDS = [
  ...LEAD_FIELDS,
  'updatedAt',
];

const assertRequiredString = (fieldName, value) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldName} is required.`);
  }
};

const assertAllowedValue = (fieldName, value, allowedValues) => {
  if (value && !allowedValues.includes(value)) {
    throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}.`);
  }
};

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

const normalizeArray = (fieldName, value) => {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array.`);
  }

  return value;
};

const assertAllowedArrayValues = (fieldName, values, allowedValues) => {
  const unsupportedValues = values.filter((value) => !allowedValues.includes(value));

  if (unsupportedValues.length > 0) {
    throw new Error(`${fieldName} contains unsupported value(s): ${unsupportedValues.join(', ')}.`);
  }
};

export const validateLeadRequiredFields = (leadData) => {
  assertRequiredString('studentName', leadData.studentName);
  assertRequiredString('parentPhone', leadData.parentPhone);
};

export const buildLeadPayload = (leadData) => {
  validateLeadRequiredFields(leadData);

  const subjects = normalizeArray('subjects', leadData.subjects);
  const serviceInterests = normalizeArray('serviceInterests', leadData.serviceInterests);
  const grade = normalizeString(leadData.grade);
  const leadSource = normalizeString(leadData.leadSource);
  const owner = normalizeString(leadData.owner) || 'Both';
  const priority = normalizeString(leadData.priority) || 'Warm';
  const status = normalizeString(leadData.status) || 'New';
  const objection = normalizeString(leadData.objection);

  assertAllowedValue('grade', grade, LEAD_GRADES);
  assertAllowedArrayValues('subjects', subjects, LEAD_SUBJECTS);
  assertAllowedArrayValues('serviceInterests', serviceInterests, LEAD_SERVICE_INTERESTS);
  assertAllowedValue('leadSource', leadSource, LEAD_SOURCES);
  assertAllowedValue('owner', owner, LEAD_OWNERS);
  assertAllowedValue('priority', priority, LEAD_PRIORITIES);
  assertAllowedValue('status', status, LEAD_STATUSES);
  assertAllowedValue('objection', objection, LEAD_OBJECTIONS);

  return {
    studentName: normalizeString(leadData.studentName),
    grade,
    subjects,
    parentName: normalizeString(leadData.parentName),
    parentPhone: normalizeString(leadData.parentPhone),
    serviceInterests,
    serviceInterestOtherNotes: normalizeString(leadData.serviceInterestOtherNotes),
    leadSource,
    leadSourceOtherNotes: normalizeString(leadData.leadSourceOtherNotes),
    owner,
    priority,
    status,
    nextFollowUpDate: normalizeString(leadData.nextFollowUpDate),
    lastContactedDate: normalizeString(leadData.lastContactedDate),
    objection,
    objectionOtherNotes: normalizeString(leadData.objectionOtherNotes),
    generalNotes: normalizeString(leadData.generalNotes),
    activityLog: [],
    createdBy: normalizeString(leadData.createdBy) || 'system',
    updatedBy: normalizeString(leadData.updatedBy) || normalizeString(leadData.createdBy) || 'system',
  };
};

export const buildLeadUpdatePayload = (updatedData) => {
  const updatePayload = { ...updatedData };

  if (Object.prototype.hasOwnProperty.call(updatePayload, 'activityLog')) {
    throw new Error('activityLog can only be appended through addLeadActivity.');
  }

  const unknownFields = Object.keys(updatePayload).filter(
    (fieldName) => !LEAD_UPDATE_FIELDS.includes(fieldName) && fieldName !== 'id' && fieldName !== 'createdAt'
  );

  if (unknownFields.length > 0) {
    throw new Error(`Unsupported lead field(s): ${unknownFields.join(', ')}.`);
  }

  if (Object.prototype.hasOwnProperty.call(updatePayload, 'studentName')) {
    assertRequiredString('studentName', updatePayload.studentName);
    updatePayload.studentName = normalizeString(updatePayload.studentName);
  }

  if (Object.prototype.hasOwnProperty.call(updatePayload, 'parentPhone')) {
    assertRequiredString('parentPhone', updatePayload.parentPhone);
    updatePayload.parentPhone = normalizeString(updatePayload.parentPhone);
  }

  if (Object.prototype.hasOwnProperty.call(updatePayload, 'grade')) {
    updatePayload.grade = normalizeString(updatePayload.grade);
    assertAllowedValue('grade', updatePayload.grade, LEAD_GRADES);
  }

  if (Object.prototype.hasOwnProperty.call(updatePayload, 'subjects')) {
    updatePayload.subjects = normalizeArray('subjects', updatePayload.subjects);
    assertAllowedArrayValues('subjects', updatePayload.subjects, LEAD_SUBJECTS);
  }

  if (Object.prototype.hasOwnProperty.call(updatePayload, 'serviceInterests')) {
    updatePayload.serviceInterests = normalizeArray('serviceInterests', updatePayload.serviceInterests);
    assertAllowedArrayValues('serviceInterests', updatePayload.serviceInterests, LEAD_SERVICE_INTERESTS);
  }

  if (Object.prototype.hasOwnProperty.call(updatePayload, 'leadSource')) {
    updatePayload.leadSource = normalizeString(updatePayload.leadSource);
    assertAllowedValue('leadSource', updatePayload.leadSource, LEAD_SOURCES);
  }

  if (Object.prototype.hasOwnProperty.call(updatePayload, 'owner')) {
    updatePayload.owner = normalizeString(updatePayload.owner);
    assertAllowedValue('owner', updatePayload.owner, LEAD_OWNERS);
  }

  if (Object.prototype.hasOwnProperty.call(updatePayload, 'priority')) {
    updatePayload.priority = normalizeString(updatePayload.priority);
    assertAllowedValue('priority', updatePayload.priority, LEAD_PRIORITIES);
  }

  if (Object.prototype.hasOwnProperty.call(updatePayload, 'status')) {
    updatePayload.status = normalizeString(updatePayload.status);
    assertAllowedValue('status', updatePayload.status, LEAD_STATUSES);
  }

  if (Object.prototype.hasOwnProperty.call(updatePayload, 'objection')) {
    updatePayload.objection = normalizeString(updatePayload.objection);
    assertAllowedValue('objection', updatePayload.objection, LEAD_OBJECTIONS);
  }

  const stringFields = [
    'parentName',
    'serviceInterestOtherNotes',
    'leadSourceOtherNotes',
    'nextFollowUpDate',
    'lastContactedDate',
    'objectionOtherNotes',
    'generalNotes',
    'createdBy',
    'updatedBy',
  ];

  stringFields.forEach((fieldName) => {
    if (Object.prototype.hasOwnProperty.call(updatePayload, fieldName)) {
      updatePayload[fieldName] = normalizeString(updatePayload[fieldName]);
    }
  });

  delete updatePayload.id;
  delete updatePayload.createdAt;
  delete updatePayload.activityLog;

  return updatePayload;
};

export const buildLeadActivityPayload = (activityData, createdAt) => {
  assertRequiredString('note', activityData.note);

  return {
    note: normalizeString(activityData.note),
    createdAt,
    createdBy: normalizeString(activityData.createdBy) || 'system',
  };
};
