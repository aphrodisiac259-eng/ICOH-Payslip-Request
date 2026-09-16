/**
 * ICOH Portal - In-App Notification Center Drawer
 */

import React from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { formatDate } from '../../utils/formatting';
import { X, CheckCheck, Trash2, Bell, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToRequest?: (requestId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateToRequest,
}) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification } = useNotifications();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 bg-emerald-900 text-white flex items-center justify-between border-b border-emerald-800">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-emerald-300" />
              <h2 className="text-base font-bold">Notifications Center</h2>
              {unreadCount > 0 && (
                <span className="bg-amber-500 text-emerald-950 text-xs px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-emerald-300 hover:text-white hover:bg-emerald-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Toolbar */}
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>{notifications.length} Total Alerts</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-emerald-700 hover:text-emerald-900 font-medium flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Bell className="w-10 h-10 mx-auto mb-2 stroke-[1.5] text-slate-300" />
                <p className="font-medium text-sm text-slate-600">No notifications</p>
                <p className="text-xs text-slate-400 mt-1">Updates regarding your payslip requests will appear here.</p>
              </div>
            ) : (
              notifications.map((n) => {
                let icon = <Clock className="w-4 h-4 text-blue-600" />;
                if (n.type === 'ready' || n.type === 'completed') {
                  icon = <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
                } else if (n.type === 'rejected') {
                  icon = <AlertTriangle className="w-4 h-4 text-rose-600" />;
                }

                return (
                  <div
                    key={n.notificationId}
                    className={`p-3.5 rounded-lg border transition-all ${
                      n.isRead
                        ? 'bg-slate-50/70 border-slate-200 text-slate-700'
                        : 'bg-emerald-50/80 border-emerald-300 text-slate-900 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {icon}
                        <h4 className="text-sm font-semibold leading-tight">{n.title}</h4>
                      </div>
                      <button
                        onClick={() => removeNotification(n.notificationId)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Dismiss"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs mt-1.5 leading-relaxed text-slate-600">{n.message}</p>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-200/60">
                      <span>{formatDate(n.createdAt)}</span>
                      <div className="flex items-center gap-2">
                        {n.relatedRequestId && onNavigateToRequest && (
                          <button
                            onClick={() => {
                              onNavigateToRequest(n.relatedRequestId!);
                              onClose();
                            }}
                            className="text-emerald-700 hover:underline font-medium"
                          >
                            View Ref
                          </button>
                        )}
                        {!n.isRead && (
                          <button
                            onClick={() => markAsRead(n.notificationId)}
                            className="text-slate-500 hover:text-emerald-700 font-medium"
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
