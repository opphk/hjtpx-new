import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface AlertProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  message: string;
  description?: string;
  onClose?: () => void;
  closable?: boolean;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  message,
  description,
  onClose,
  closable = true,
}) => {
  const getAlertStyles = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#E8F5E9',
          borderColor: '#4CAF50',
          iconColor: '#4CAF50',
        };
      case 'error':
        return {
          backgroundColor: '#FFEBEE',
          borderColor: '#F44336',
          iconColor: '#F44336',
        };
      case 'warning':
        return {
          backgroundColor: '#FFF3E0',
          borderColor: '#FF9800',
          iconColor: '#FF9800',
        };
      default:
        return {
          backgroundColor: '#E3F2FD',
          borderColor: '#2196F3',
          iconColor: '#2196F3',
        };
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      default:
        return 'ℹ';
    }
  };

  const alertStyles = getAlertStyles();

  return (
    <View
      style={[
        styles.alert,
        {
          backgroundColor: alertStyles.backgroundColor,
          borderColor: alertStyles.borderColor,
        },
      ]}
    >
      <View style={styles.iconContainer}>
        <Text style={[styles.icon, { color: alertStyles.iconColor }]}>
          {getIcon()}
        </Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.message}>{message}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
      {closable && onClose && (
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  alert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  iconContainer: {
    marginRight: 12,
  },
  icon: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  description: {
    fontSize: 13,
    color: '#3C3C43',
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  closeText: {
    fontSize: 14,
    color: '#8E8E93',
  },
});
