import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Card } from '../components';
import { useAuth } from '../context/AuthContext';

export const DashboardScreen: React.FC = () => {
  const { user } = useAuth();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>仪表盘</Text>
        <Text style={styles.subtitle}>查看您的数据概览</Text>
      </View>

      <Card title="今日概览" style={styles.card}>
        <View style={styles.overviewRow}>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewValue}>0</Text>
            <Text style={styles.overviewLabel}>新增</Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewValue}>0</Text>
            <Text style={styles.overviewLabel}>进行中</Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewValue}>0</Text>
            <Text style={styles.overviewLabel}>已完成</Text>
          </View>
        </View>
      </Card>

      <Card title="最近活动" style={styles.card}>
        <View style={styles.activityItem}>
          <Text style={styles.activityText}>暂无活动记录</Text>
          <Text style={styles.activityTime}>-</Text>
        </View>
      </Card>

      <Card title="快捷操作" style={styles.card}>
        <View style={styles.shortcutGrid}>
          <View style={styles.shortcutItem}>
            <Text style={styles.shortcutIcon}>📊</Text>
            <Text style={styles.shortcutLabel}>数据分析</Text>
          </View>
          <View style={styles.shortcutItem}>
            <Text style={styles.shortcutIcon}>📝</Text>
            <Text style={styles.shortcutLabel}>任务管理</Text>
          </View>
          <View style={styles.shortcutItem}>
            <Text style={styles.shortcutIcon}>👥</Text>
            <Text style={styles.shortcutLabel}>团队协作</Text>
          </View>
          <View style={styles.shortcutItem}>
            <Text style={styles.shortcutIcon}>⚙️</Text>
            <Text style={styles.shortcutLabel}>系统设置</Text>
          </View>
        </View>
      </Card>

      <Card title="用户信息" style={styles.card}>
        <View style={styles.userInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>用户名:</Text>
            <Text style={styles.infoValue}>{user?.name || '未知'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>邮箱:</Text>
            <Text style={styles.infoValue}>{user?.email || '未知'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>注册时间:</Text>
            <Text style={styles.infoValue}>
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString('zh-CN')
                : '未知'}
            </Text>
          </View>
        </View>
      </Card>
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
    backgroundColor: '#5856D6',
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
  card: {
    margin: 16,
    marginBottom: 0,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  overviewItem: {
    alignItems: 'center',
  },
  overviewValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#5856D6',
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  activityText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  activityTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
  shortcutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  shortcutItem: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  shortcutIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  shortcutLabel: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  userInfo: {
    paddingVertical: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  infoLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  infoValue: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500',
  },
});

export default DashboardScreen;
