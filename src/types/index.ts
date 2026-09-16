/**
 * ICOH Payslip Request Portal - Types & Data Models
 * Intercountry Centre for Oral Health for Africa
 */

export type AccountStatus = 'Active' | 'Inactive' | 'Suspended';
export type EmploymentStatus = 'Full-Time' | 'Contract' | 'Permanent' | 'Probation';
export type RequestStatus = 'Pending' | 'Processing' | 'Ready' | 'Completed' | 'Rejected' | 'Cancelled';
export type PayslipStatus = RequestStatus;
export type AdminRole = 'SuperAdmin' | 'PayrollOfficer';
export type NotificationType = 'request_submitted' | 'processing' | 'ready' | 'rejected' | 'completed' | 'account_event';

export interface Employee {
  uid: string;
  staffId: string;
  fullName: string;
  email: string;
  department: string;
  unit?: string;
  designation: string;
  employmentStatus?: EmploymentStatus;
  accountStatus: AccountStatus;
  firstLoginComplete: boolean;
  phoneNumber?: string;
  residentialAddress?: string;
  emergencyContact?: string;
  nextOfKin?: string;
  nextOfKinPhone?: string;
  salaryGrade?: string;
  step?: string;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
  };
  createdAt: string;
  lastLogin?: string;
  updatedAt?: string;
}

export interface PayslipRequest {
  id?: string;
  requestId: string;
  employeeUID: string;
  staffId: string;
  employeeName: string;
  department: string;
  month: number;
  year: number;
  remarks?: string;
  status: RequestStatus;
  createdAt: string;
  submittedAt: string;
  processedAt?: string | null;
  completedAt?: string | null;
  requestedByUID: string;
  processedByUID?: string | null;
  processedByName?: string | null;
  internalNotes?: string | null;
  rejectionReason?: string | null;
}

export interface Payslip {
  id?: string;
  payslipId: string;
  requestId: string;
  employeeUID: string;
  staffId: string;
  employeeName?: string;
  month: number;
  year: number;
  storageRef: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  uploadedByUID: string;
  uploadedByName?: string;
  downloadedAt?: string | null;
  downloadedByUID?: string | null;
}

export interface AppNotification {
  id?: string;
  notificationId: string;
  recipientUID: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedRequestId?: string | null;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
}

export interface Admin {
  uid: string;
  adminId: string;
  fullName: string;
  email: string;
  role: AdminRole;
  permissions?: string[];
  status: 'Active' | 'Inactive';
  createdAt: string;
  createdByUID?: string;
}

export interface Department {
  id?: string;
  departmentId: string;
  name: string;
  code: string;
  description: string;
  createdAt?: string;
  headOfDepartment?: string;
  active?: boolean;
}

export interface AuditLog {
  id?: string;
  auditId?: string;
  logId: string;
  actorUID: string;
  actorEmail: string;
  action: string;
  targetCollection: string;
  targetDocId: string;
  targetId?: string;
  metadata?: Record<string, unknown> | string;
  timestamp: string;
  ipAddress?: string;
}

export interface SystemSetting {
  id?: string;
  settingId: string;
  organizationName: string;
  supportEmail: string;
  maxPayslipUploadSizeMB: number;
  allowedYearRange: number;
  updatedAt?: string;
  updatedByUID?: string;
}
