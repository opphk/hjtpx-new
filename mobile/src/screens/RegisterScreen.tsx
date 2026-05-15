import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Input, Card } from '../components';
import { useAuth } from '../context/AuthContext';
import { useForm, validationRules } from '../hooks/useForm';
import { RootStackParamList, RegisterRequest } from '../types';

type RegisterScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Register'
>;

interface RegisterScreenProps {
  navigation: RegisterScreenNavigationProp;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  navigation,
}) => {
  const { register } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
  } = useForm<RegisterRequest>(
    {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    [
      {
        field: 'name',
        rules: [
          validationRules.required('请输入用户名'),
          validationRules.minLength(2, '用户名至少需要2个字符'),
          validationRules.maxLength(30, '用户名最多30个字符'),
        ],
      },
      {
        field: 'email',
        rules: [
          validationRules.required('请输入邮箱地址'),
          validationRules.email('请输入有效的邮箱地址'),
        ],
      },
      {
        field: 'password',
        rules: [
          validationRules.required('请输入密码'),
          validationRules.minLength(8, '密码至少需要8个字符'),
          validationRules.password('密码必须包含大小写字母和数字'),
        ],
      },
      {
        field: 'confirmPassword',
        rules: [
          validationRules.required('请确认密码'),
          validationRules.match('password', '两次输入的密码不匹配'),
        ],
      },
    ]
  );

  const onSubmit = async (data: RegisterRequest) => {
    try {
      setServerError(null);
      const { confirmPassword, ...registerData } = data;
      await register(registerData);
      Alert.alert('注册成功', '欢迎加入我们！', [
        {
          text: '确定',
          onPress: () => navigation.navigate('Login'),
        },
      ]);
    } catch (error: any) {
      const errorMessage = error.message || '注册失败，请稍后重试';
      setServerError(errorMessage);
      Alert.alert('注册失败', errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.title}>创建账户</Text>
          <Text style={styles.subtitle}>填写以下信息完成注册</Text>
        </View>

        <Card style={styles.formCard}>
          {serverError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{serverError}</Text>
            </View>
          )}

          <Input
            label="用户名"
            placeholder="请输入用户名"
            value={values.name}
            onChangeText={handleChange('name')}
            onBlur={handleBlur('name')}
            error={touched.name ? errors.name : undefined}
            autoCapitalize="words"
            required
          />

          <Input
            label="邮箱地址"
            placeholder="请输入邮箱地址"
            value={values.email}
            onChangeText={handleChange('email')}
            onBlur={handleBlur('email')}
            error={touched.email ? errors.email : undefined}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            required
          />

          <Input
            label="密码"
            placeholder="请输入密码"
            value={values.password}
            onChangeText={handleChange('password')}
            onBlur={handleBlur('password')}
            error={touched.password ? errors.password : undefined}
            secureTextEntry
            autoCapitalize="none"
            helperText="至少8个字符，包含大小写字母和数字"
            required
          />

          <Input
            label="确认密码"
            placeholder="请再次输入密码"
            value={values.confirmPassword}
            onChangeText={handleChange('confirmPassword')}
            onBlur={handleBlur('confirmPassword')}
            error={touched.confirmPassword ? errors.confirmPassword : undefined}
            secureTextEntry
            autoCapitalize="none"
            required
          />

          <Button
            title="注册"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            size="large"
            style={styles.registerButton}
          />

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>已有账户？</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              style={styles.loginLink}
            >
              <Text style={styles.loginLinkText}>立即登录</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  formCard: {
    padding: 24,
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorBannerText: {
    color: '#D32F2F',
    fontSize: 14,
    textAlign: 'center',
  },
  registerButton: {
    marginBottom: 20,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  loginLink: {
    marginLeft: 4,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default RegisterScreen;
