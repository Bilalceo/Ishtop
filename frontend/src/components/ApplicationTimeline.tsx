"use client";

/**
 * Application Timeline Component
 * Visual timeline of application history
 */

import { CheckCircle, Clock, XCircle, AlertCircle, FileText } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ru, uz } from 'date-fns/locale';
import { useTranslation } from '@/hooks/useTranslation';

interface TimelineEvent {
  id: string;
  type: 'status_change' | 'document_upload' | 'deadline' | 'note';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
}

interface ApplicationTimelineProps {
  events: TimelineEvent[];
}

export function ApplicationTimeline({ events }: ApplicationTimelineProps) {
  const { locale } = useTranslation();
  const isRu = locale === "ru";
  const dateLocale = isRu ? ru : uz;
  const getIcon = (type: string, status?: string) => {
    if (type === 'status_change') {
      switch (status) {
        case 'accepted':
          return <CheckCircle className="h-5 w-5 text-green-600" />;
        case 'rejected':
          return <XCircle className="h-5 w-5 text-red-600" />;
        case 'pending':
          return <Clock className="h-5 w-5 text-yellow-600" />;
        default:
          return <AlertCircle className="h-5 w-5 text-blue-600" />;
      }
    }
    
    if (type === 'document_upload') {
      return <FileText className="h-5 w-5 text-emerald-600" />;
    }
    
    if (type === 'deadline') {
      return <Clock className="h-5 w-5 text-orange-600" />;
    }
    
    return <AlertCircle className="h-5 w-5 text-surface-600" />;
  };

  const getColor = (type: string, status?: string) => {
    if (type === 'status_change') {
      switch (status) {
        case 'accepted':
          return 'border-green-500 bg-green-50 dark:bg-green-950';
        case 'rejected':
          return 'border-red-500 bg-red-50 dark:bg-red-950';
        case 'pending':
          return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950';
        default:
          return 'border-blue-500 bg-blue-50 dark:bg-blue-950';
      }
    }
    
    if (type === 'document_upload') {
      return 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950';
    }
    
    if (type === 'deadline') {
      return 'border-orange-500 bg-orange-50 dark:bg-orange-950';
    }
    
    return 'border-surface-300 bg-surface-50 dark:bg-surface-800';
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-surface-500">
        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>{isRu ? "Событий пока нет" : "Hozircha vaqt jadvali hodisalari yo'q"}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline Line */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-surface-200 dark:bg-surface-700" />

      {/* Events */}
      <div className="space-y-8">
        {events.map((event, index) => (
          <div key={event.id} className="relative flex gap-4">
            {/* Icon */}
            <div className={`flex-shrink-0 w-12 h-12 rounded-full border-4 border-white dark:border-surface-900 ${getColor(event.type, event.status)} flex items-center justify-center z-10`}>
              {getIcon(event.type, event.status)}
            </div>

            {/* Content */}
            <div className="flex-1 pb-8">
              <div className={`rounded-lg border-2 p-4 ${getColor(event.type, event.status)}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">
                      {event.title}
                    </h4>
                    <p className="text-sm text-surface-600 dark:text-surface-400">
                      {event.description}
                    </p>
                  </div>
                  <div className="text-right text-xs text-surface-500">
                    <p>{format(new Date(event.timestamp), 'MMM d, yyyy', { locale: dateLocale })}</p>
                    <p>{format(new Date(event.timestamp), 'HH:mm', { locale: dateLocale })}</p>
                    <p className="mt-1 font-medium">
                      {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true, locale: dateLocale })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
