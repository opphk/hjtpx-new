import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import i18n from './index';

const localeDateFormats = {
  en: 'MM/dd/yyyy',
  zh: 'yyyy年MM月dd日',
  ja: 'yyyy年MM月dd日',
  es: 'dd/MM/yyyy'
};

const localeDateTimeFormats = {
  en: 'MM/dd/yyyy HH:mm:ss',
  zh: 'yyyy年MM月dd日 HH:mm:ss',
  ja: 'yyyy年MM月dd日 HH:mm:ss',
  es: 'dd/MM/yyyy HH:mm:ss'
};

export const formatDate = (date, lng = i18n.language) => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const formatStr = localeDateFormats[lng] || localeDateFormats.en;
  return format(d, formatStr);
};

export const formatDateTime = (date, lng = i18n.language) => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const formatStr = localeDateTimeFormats[lng] || localeDateTimeFormats.en;
  return format(d, formatStr);
};

export const formatRelativeTime = (date, lng = i18n.language) => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isToday(d)) {
    return i18n.t('dateTime.today');
  }
  
  if (isYesterday(d)) {
    return i18n.t('dateTime.yesterday');
  }
  
  const distance = formatDistanceToNow(d, { addSuffix: true });
  return distance;
};

export const formatTimeAgo = (date, lng = i18n.language) => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return i18n.t('dateTime.justNow');
  } else if (diffMins < 60) {
    return i18n.t('dateTime.minutesAgo', { count: diffMins });
  } else if (diffHours < 24) {
    return i18n.t('dateTime.hoursAgo', { count: diffHours });
  } else {
    return i18n.t('dateTime.daysAgo', { count: diffDays });
  }
};
