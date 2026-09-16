/**
 * ICOH Portal - Audit Trail Service
 * Records immutable audit logs for all security-sensitive, operational, and data actions.
 */

import { doc, setDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase/config';
import { AuditLog } from '../types';

export async function logAuditEvent(
  actorUID: string,
  actorEmail: string,
  action: string,
  targetCollection: string,
  targetDocId: string,
  metadata?: Record<string, unknown> | string
): Promise<void> {
  const currentUid = auth.currentUser?.uid || actorUID;

  // If there is no authenticated session, client-side audit logs cannot be written under secure rules
  if (!currentUid || currentUid === 'anonymous' || currentUid === 'system') {
    return;
  }

  // Dispatch to server-side authority endpoint for immutable Admin SDK write
  try {
    if (auth.currentUser) {
      const idToken = await auth.currentUser.getIdToken();
      await fetch('/api/audit/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          action,
          targetCollection,
          targetDocId,
          metadata,
        }),
      });
    }
  } catch (error) {
    // Non-blocking log catch to prevent cascading failures
    console.warn('Audit log dispatch error:', error);
  }
}


export async function getRecentAuditLogs(maxCount: number = 100): Promise<AuditLog[]> {
  const path = 'auditLogs';
  try {
    const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(maxCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => {
      const data = d.data() as AuditLog;
      return {
        ...data,
        auditId: data.logId,
        targetId: data.targetDocId,
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export const getAuditLogs = getRecentAuditLogs;
