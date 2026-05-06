/**
 * Firestore Database Schema Interfaces
 * All writes to Firestore must adhere to these interfaces.
 */

export interface Student {
  id?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  parentName?: string;
  grade?: string;
  subjects?: string[];
  studentType: 'center' | 'one-on-one';
  centerClass?: 'Abir' | 'Rahat' | 'Unassigned';
  tuitionRate: number;
  expectedMonthlyTutoringHours?: number | null;
  assignedTutorName?: string;
  tutorHourlyPay?: number | null;
  startDate: string;
  isActive: boolean;
  centerLocation?: string;
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface AttendanceRecord {
  id?: string;
  studentId: string;
  studentName: string;
  date: string; // YYYY-MM-DD
  monthKey: string; // YYYY-MM
  status: 'present' | 'absent' | 'empty';
  studentType: 'center' | 'online';
  note?: string;
  updatedAt?: any;
}

export interface TuitionRecord {
  id?: string;
  studentId: string;
  studentName: string;
  studentType: 'center' | 'one-on-one';
  tuitionType: 'monthly' | 'hourly';
  expectedAmount: number;
  expectedTutoringHours?: number | null;
  completedTutoringHours?: number | null;
  hourlyRate?: number | null;
  earnedAmount?: number | null;
  tutorName?: string;
  tutorHourlyPay?: number | null;
  expectedTutorExpense?: number | null;
  tutorExpense?: number | null;
  expectedProfit?: number | null;
  earnedProfit?: number | null;
  paidAmount: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  paymentDate?: string; // YYYY-MM-DD
  paymentMethod?: 'cash' | 'zelle' | 'check' | 'card' | 'other' | '';
  note?: string;
  isPaused?: boolean;
  pauseReason?: string;
  pauseNote?: string;
  pausedAt?: any;
  pausedBy?: string;
  resumedAt?: any;
  resumedBy?: string;
  monthKey: string; // YYYY-MM
  updatedAt?: any;
}

export interface Goal {
  id?: string;
  goalDescription: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  year: number;
  owner: 'Abir' | 'Rahat' | 'Both';
  priority: 'P0' | 'P1' | 'P2';
  progress: number;
  startDate: string;
  endDate: string;
  status: 'Not Started' | 'In Progress' | 'Done' | 'Blocked';
  notes: string;
  createdAt?: any;
  updatedAt?: any;
  createdBy: string;
  updatedBy: string;
}

export interface Task {
  id?: string;
  title: string;
  description: string;
  owner: 'Abir' | 'Rahat' | 'Both';
  priority: 'High' | 'Medium' | 'Low';
  status: 'To Do' | 'In Progress' | 'Done' | 'Blocked';
  dueDate: string;
  monthKey: string; // YYYY-MM
  notes: string;
  createdBy: string;
  updatedBy: string;
  createdAt?: any;
  updatedAt?: any;
  completedAt?: any | null;
}

export interface LeadActivity {
  note: string;
  createdAt?: any;
  createdBy: string;
}

export interface Lead {
  id?: string;
  studentName: string;
  grade: 'K' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12' | 'College' | 'Other' | '';
  subjects: ('State Test Prep' | 'SHSAT' | 'Regents' | 'Common Core' | 'Other')[];
  parentName: string;
  parentPhone: string;
  serviceInterests: ('Center' | 'One-on-One In-Person' | 'One-on-One Remote' | 'Remote Group' | 'SAT' | 'State Test Prep' | 'Regents' | 'Other')[];
  serviceInterestOtherNotes: string;
  leadSource: 'Referral' | 'Facebook' | 'Walk-In' | 'Friend/Family' | 'Other' | '';
  leadSourceOtherNotes: string;
  owner: 'Abir' | 'Rahat' | 'Both';
  priority: 'Hot' | 'Warm' | 'Cold';
  status: 'New' | 'Reached Out' | 'Follow-Up Needed' | 'Trial Scheduled' | 'Converted' | 'Closed' | 'Not Interested';
  nextFollowUpDate: string;
  lastContactedDate: string;
  objection: 'Price too high' | 'Too many hours' | 'Not interested in remote' | 'Schedule conflict' | 'Needs to discuss with family' | 'Chose another tutor' | 'Not ready yet' | 'Other' | '';
  objectionOtherNotes: string;
  generalNotes: string;
  activityLog: LeadActivity[];
  createdAt?: any;
  updatedAt?: any;
  createdBy: string;
  updatedBy: string;
}
