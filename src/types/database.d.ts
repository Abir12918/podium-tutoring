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
  studentType: 'center' | 'online';
  tuitionRate: number;
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
  studentType: 'center' | 'online';
  expectedAmount: number;
  paidAmount: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  paymentDate?: string; // YYYY-MM-DD
  paymentMethod?: 'cash' | 'zelle' | 'check' | 'card' | 'other' | '';
  note?: string;
  monthKey: string; // YYYY-MM
  updatedAt?: any;
}
