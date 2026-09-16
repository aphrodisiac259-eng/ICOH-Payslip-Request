/**
 * ICOH Portal - Payslip Storage & Document Management Service
 * Handles secure upload to Firebase Storage, metadata registration in Firestore,
 * and authorized PDF downloads using Firebase Storage authenticated access with audit logging.
 *
 * NOTE: Payslip PDFs must NEVER be converted to Data URLs or stored in Firestore.
 * Firestore stores ONLY payslip metadata and the Firebase Storage path.
 */

import { ref, uploadBytes, getBlob } from 'firebase/storage';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { auth, storage, db } from '../firebase/config';
import { Payslip } from '../types';
import { sanitizeFilename } from '../utils/validation';
import { logAuditEvent } from './auditService';
import { sendEmailNotification } from './emailService';
import { getMonthName } from '../utils/formatting';


export async function uploadPayslipDocument(params: {
  file: File;
  requestId: string;
  employeeUID?: string;
  staffId?: string;
  employeeName?: string;
  employeeEmail?: string;
  month?: number;
  year?: number;
  uploadedByUID?: string;
  uploadedByName?: string;
  actorEmail?: string;
}): Promise<Payslip> {
  const { file, requestId } = params;

  if (!auth.currentUser) {
    throw new Error('Unauthorized: An authenticated administrator session is required to upload payslips.');
  }

  const idToken = await auth.currentUser.getIdToken();

  // 1. Server-Side Verification of Request Integrity & Role Authorization
  // Verifies:
  // - requestId exists
  // - request belongs to employeeUID
  // - Staff ID matches request
  // - month matches request
  // - year matches request
  // - request is eligible for processing
  // - uploader is an active authorized Payroll Officer or Super Admin
  // Does not trust client-supplied employeeUID, staffId, month, or year.
  const verifyRes = await fetch('/api/admin/verify-payslip-upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ requestId }),
  });

  if (!verifyRes.ok) {
    const errorData = await verifyRes.json().catch(() => ({}));
    throw new Error(errorData.error || 'Server rejected payslip upload verification.');
  }

  const verifyData = await verifyRes.json();
  const authoritative = verifyData.authoritativeData;

  const sanitizedFileName = sanitizeFilename(file.name);
  const storagePath = authoritative.storagePath; // 'payslips/{requestId}/{payslipId}.pdf'

  // 2. Upload PDF directly to Firebase Storage with authenticated session & metadata
  const storageRef = ref(storage, storagePath);
  const metadata = {
    contentType: 'application/pdf',
    customMetadata: {
      requestId: authoritative.requestId,
      employeeUID: authoritative.employeeUID,
      staffId: authoritative.staffId,
      month: String(authoritative.month),
      year: String(authoritative.year),
      uploadedByUID: auth.currentUser.uid,
    },
  };

  // If Storage upload fails, this will throw directly. We do NOT create any payslip record!
  await uploadBytes(storageRef, file, metadata);

  // 3. Finalize registration on trusted server authority
  // Creates Firestore metadata record, marks request Ready, writes audit log, and creates in-app notification
  const finalizeRes = await fetch('/api/admin/finalize-payslip-upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      requestId: authoritative.requestId,
      fileName: sanitizedFileName,
      fileSize: file.size,
    }),
  });

  if (!finalizeRes.ok) {
    const errorData = await finalizeRes.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to finalize payslip registration on authority server.');
  }

  const finalizeData = await finalizeRes.json();
  const payslipDoc: Payslip = finalizeData.payslip;

  // 4. Send email notification via email service
  if (authoritative.employeeEmail) {
    const monthName = getMonthName(authoritative.month);
    await sendEmailNotification({
      toEmail: authoritative.employeeEmail,
      recipientName: authoritative.employeeName,
      subject: `Official ICOH Payslip Available - ${monthName} ${authoritative.year}`,
      template: 'payslip_ready',
      requestId: authoritative.requestId,
      monthName,
      year: authoritative.year,
    });
  }

  return payslipDoc;
}


/**
 * Downloads payslip binary directly from Firebase Storage using authenticated access.
 * Enforces employee identity & admin role checks. Never uses dataUrl fallback.
 */
export async function downloadPayslip(
  payslip: Payslip,
  userUID: string,
  userEmail: string
): Promise<void> {
  // Enforce access control
  if (payslip.employeeUID !== userUID) {
    const adminDoc = await getDoc(doc(db, 'admins', userUID));
    if (!adminDoc.exists()) {
      throw new Error('Unauthorized: You are not permitted to download this payslip.');
    }
  }

  // Download Blob directly from Firebase Storage (subject to Firebase Storage security rules)
  const storageRef = ref(storage, payslip.storageRef);
  const blob = await getBlob(storageRef);

  // Authoritatively record download activity and immutable audit event on server
  try {
    if (auth.currentUser) {
      const idToken = await auth.currentUser.getIdToken();
      await fetch('/api/payslips/record-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          payslipId: payslip.payslipId,
        }),
      });
    }
  } catch (err) {
    console.warn('Could not record authoritative payslip download:', err);
  }

  // Trigger client-side save using object URL
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = payslip.fileName || `ICOH_Payslip_${payslip.staffId}_${payslip.month}_${payslip.year}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(objectUrl);
}

/**
 * Fetches authenticated blob from Firebase Storage and creates a temporary Object URL for preview.
 * The returned object URL must be revoked with URL.revokeObjectURL when done.
 */
export async function getPayslipBlobUrl(payslip: Payslip, userUID: string): Promise<string> {
  // Enforce access control
  if (payslip.employeeUID !== userUID) {
    const adminDoc = await getDoc(doc(db, 'admins', userUID));
    if (!adminDoc.exists()) {
      throw new Error('Unauthorized: You are not permitted to preview this payslip.');
    }
  }

  const storageRef = ref(storage, payslip.storageRef);
  const blob = await getBlob(storageRef);
  return window.URL.createObjectURL(blob);
}
