/**
 * ICOH Portal - In-App Notification Service
 */

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { AppNotification, NotificationType } from '../types';

import { auth } from '../firebase/config';

export async function sendNotification(
  _recipientUID: string,
  type: NotificationType,
  _title: string,
  _message: string,
  relatedRequestId?: string | null
): Promise<void> {
  // If this is a request submission event, dispatch via server-side authority
  if (type === 'request_submitted' && relatedRequestId && auth.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken();
      await fetch('/api/requests/notify-submitted', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ requestId: relatedRequestId }),
      });
    } catch (err) {
      console.warn('Server notification dispatch error:', err);
    }
  }
  // Other notifications (ready, processing, rejected) are created directly by server authority
}


export function subscribeToUserNotifications(
  recipientUID: string,
  onData: (notifications: AppNotification[]) => void
): Unsubscribe {
  const path = 'notifications';
  try {
    const q = query(
      collection(db, path),
      where('recipientUID', '==', recipientUID),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        })) as AppNotification[];
        onData(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const path = `notifications/${notificationId}`;
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      isRead: true,
      readAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const path = `notifications/${notificationId}`;
  try {
    await deleteDoc(doc(db, 'notifications', notificationId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
