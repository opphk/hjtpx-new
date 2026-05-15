import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Card } from '../components';

export const NotificationsScreen: React.FC = () => {
  const [notifications] = useState([
    {
      id: '1',
      title: '欢迎使用',
      message: '感谢您注册我们的应用',
      time: '刚刚',
      read: false,
    },
  ]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>通知中心</Text>
        <Text style={styles.subtitle}>
          {notifications.filter((n) => !n.read).length} 条未读消息
        </Text>
      </View>

      <View style={styles.notificationList}>
        {notifications.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>暂无通知</Text>
            <Text style={styles.emptySubtext}>
              当有新通知时，会在这里显示
            </Text>
          </Card>
        ) : (
          notifications.map((notification) => (
            <TouchableOpacity key={notification.id}>
              <Card
                style={[
                  styles.notificationCard,
                  !notification.read && styles.unreadCard,
                ]}
              >
                <View style={styles.notificationHeader}>
                  <Text
                    style={[
                      styles.notificationTitle,
                      !notification.read && styles.unreadTitle,
                    ]}
                  >
                    {notification.title}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {notification.time}
                  </Text>
                </View>
                <Text style={styles.notificationMessage}>
                  {notification.message}
                </Text>
                {!notification.read && (
                  <View style={styles.unreadBadge} />
                )}
              </Card>
            </TouchableOpacity>
          ))
        )}
      </View>

      {notifications.length > 0 && (
        <TouchableOpacity style={styles.clearButton}>
          <Text style={styles.clearButtonText}>清除所有通知</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    padding: 20,
    backgroundColor: '#FF9500',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  notificationList: {
    padding: 16,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
  },
  notificationCard: {
    marginBottom: 12,
    position: 'relative',
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
  },
  unreadTitle: {
    color: '#007AFF',
  },
  notificationTime: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
  },
  unreadBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  clearButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default NotificationsScreen;
