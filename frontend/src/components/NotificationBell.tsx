"use client";

/**
 * Notification Bell Component
 * Shows unread notification count and dropdown
 */

import { useState, useEffect } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { ru, uz } from 'date-fns/locale';
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const { locale } = useTranslation();
  const isRu = locale === "ru";
  const dateLocale = isRu ? ru : uz;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications?limit=10');
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unread_count);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    setLoading(true);
    try {
      await api.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-600 bg-green-50 dark:bg-green-950';
      case 'warning': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950';
      case 'error': return 'text-red-600 bg-red-50 dark:bg-red-950';
      default: return 'text-blue-600 bg-blue-50 dark:bg-blue-950';
    }
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Content */}
          <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-surface-800 rounded-lg shadow-xl border border-surface-200 dark:border-surface-700 z-20">
            {/* Header */}
            <div className="p-4 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between">
              <h3 className="font-semibold">{isRu ? "Уведомления" : "Bildirishnomalar"}</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  disabled={loading}
                >
                  <Check className="h-4 w-4 mr-1" />
                  {isRu ? "Отметить все" : "Barchasini o'qilgan qilish"}
                </Button>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-surface-500">
                  <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>{isRu ? "Уведомлений пока нет" : "Hozircha bildirishnoma yo'q"}</p>
                </div>
              ) : (
                notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-surface-100 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-750 transition-colors ${
                      !notification.is_read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Type Indicator */}
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getTypeColor(notification.type)}`} />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{notification.title}</p>
                        <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-surface-500 mt-2">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: dateLocale })}
                        </p>
                        
                        {notification.link && (
                          <Link
                            href={notification.link}
                            className="text-xs text-brand-600 hover:text-brand-700 mt-2 inline-block"
                            onClick={() => {
                              markAsRead(notification.id);
                              setIsOpen(false);
                            }}
                          >
                            {isRu ? "Подробнее →" : "Batafsil →"}
                          </Link>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1">
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => markAsRead(notification.id)}
                            title={isRu ? "Прочитано" : "O'qildi deb belgilash"}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          onClick={() => deleteNotification(notification.id)}
                          title={isRu ? "Удалить" : "O'chirish"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-surface-200 dark:border-surface-700 text-center">
                <Link
                  href="/student/notifications"
                  className="text-sm text-brand-600 hover:text-brand-700"
                  onClick={() => setIsOpen(false)}
                >
                  {isRu ? "Все уведомления →" : "Barcha bildirishnomalar →"}
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
