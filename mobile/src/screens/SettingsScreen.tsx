import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { Card, Button } from '../components';
import { useAuth } from '../context/AuthContext';

export const SettingsScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = React.useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>设置</Text>
        <Text style={styles.subtitle}>管理您的应用偏好</Text>
      </View>

      <Card title="账户信息" style={styles.card}>
        <View style={styles.userProfile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || '未知用户'}</Text>
            <Text style={styles.userEmail}>{user?.email || '未知邮箱'}</Text>
          </View>
        </View>
      </Card>

      <Card title="通知设置" style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>接收通知</Text>
            <Text style={styles.settingDescription}>
              接收应用推送和提醒
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </Card>

      <Card title="应用设置" style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>深色模式</Text>
            <Text style={styles.settingDescription}>
              切换应用主题为深色
            </Text>
          </View>
          <Switch
            value={darkModeEnabled}
            onValueChange={setDarkModeEnabled}
            trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </Card>

      <Card title="其他设置" style={styles.card}>
        <View style={styles.menuItem}>
          <Text style={styles.menuItemText}>隐私政策</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </View>
        <View style={styles.menuItem}>
          <Text style={styles.menuItemText}>服务条款</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </View>
        <View style={styles.menuItem}>
          <Text style={styles.menuItemText}>帮助中心</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </View>
        <View style={styles.menuItem}>
          <Text style={styles.menuItemText}>关于我们</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </View>
      </Card>

      <View style={styles.logoutContainer}>
        <Button
          title="退出登录"
          variant="outline"
          onPress={handleLogout}
          style={styles.logoutButton}
        />
      </View>

      <View style={styles.versionInfo}>
        <Text style={styles.versionText}>版本 1.0.0</Text>
      </View>
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
    backgroundColor: '#34C759',
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
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#8E8E93',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: '#1C1C1E',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#8E8E93',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  menuItemText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  menuItemArrow: {
    fontSize: 20,
    color: '#C7C7CC',
  },
  logoutContainer: {
    padding: 16,
    paddingTop: 8,
  },
  logoutButton: {
    borderColor: '#FF3B30',
  },
  versionInfo: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 13,
    color: '#8E8E93',
  },
});

export default SettingsScreen;
