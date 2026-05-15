import { useState, useCallback } from 'react';
import { FormState, ValidationError } from '../types';

// 验证规则类型
export interface ValidationRule {
  field: string;
  rules: Array<{
    validator: (value: any) => boolean;
    message: string;
  }>;
}

// 表单验证Hook返回值类型
interface UseFormReturn<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
  setValue: (field: keyof T, value: any) => void;
  setError: (field: keyof T, error: string) => void;
  clearError: (field: keyof T) => void;
  clearAllErrors: () => void;
  handleChange: (field: keyof T) => (value: any) => void;
  handleBlur: (field: keyof T) => () => void;
  handleSubmit: (onSubmit: (values: T) => void | Promise<void>) => () => void;
  reset: (newValues?: Partial<T>) => void;
  validate: () => boolean;
  setValues: (values: Partial<T>) => void;
}

// 表单验证Hook
export function useForm<T extends Record<string, any>>(
  initialValues: T,
  validationRules?: ValidationRule[]
): UseFormReturn<T> {
  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 验证单个字段
  const validateField = useCallback(
    (field: keyof T, value: any): string | null => {
      if (!validationRules) return null;

      const rule = validationRules.find((r) => r.field === field);
      if (!rule) return null;

      for (const { validator, message } of rule.rules) {
        if (!validator(value)) {
          return message;
        }
      }

      return null;
    },
    [validationRules]
  );

  // 设置字段值
  const setValue = useCallback(
    (field: keyof T, value: any) => {
      setValuesState((prev) => ({ ...prev, [field]: value }));

      if (touched[field]) {
        const error = validateField(field, value);
        setErrors((prev) => ({
          ...prev,
          [field]: error || undefined,
        }));
      }
    },
    [touched, validateField]
  );

  // 设置错误
  const setError = useCallback((field: keyof T, error: string) => {
    setErrors((prev) => ({ ...prev, [field]: error }));
  }, []);

  // 清除错误
  const clearError = useCallback((field: keyof T) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  // 清除所有错误
  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  // 处理输入变化
  const handleChange = useCallback(
    (field: keyof T) => (value: any) => {
      setValue(field, value);
    },
    [setValue]
  );

  // 处理字段失焦
  const handleBlur = useCallback(
    (field: keyof T) => () => {
      setTouched((prev) => ({ ...prev, [field]: true }));

      const value = values[field];
      const error = validateField(field, value);
      setErrors((prev) => ({
        ...prev,
        [field]: error || undefined,
      }));
    },
    [values, validateField]
  );

  // 验证所有字段
  const validate = useCallback((): boolean => {
    if (!validationRules) return true;

    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    validationRules.forEach((rule) => {
      const value = values[rule.field as keyof T];
      for (const { validator, message } of rule.rules) {
        if (!validator(value)) {
          newErrors[rule.field as keyof T] = message;
          isValid = false;
          break;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [validationRules, values]);

  // 处理表单提交
  const handleSubmit = useCallback(
    (onSubmit: (values: T) => void | Promise<void>) => () => {
      return async () => {
        setIsSubmitting(true);

        // 标记所有字段为已触碰
        const allTouched = Object.keys(values).reduce(
          (acc, key) => ({ ...acc, [key]: true }),
          {} as Record<keyof T, boolean>
        );
        setTouched(allTouched);

        const isFormValid = validate();
        if (!isFormValid) {
          setIsSubmitting(false);
          return;
        }

        try {
          await onSubmit(values);
        } finally {
          setIsSubmitting(false);
        }
      };
    },
    [values, validate]
  );

  // 重置表单
  const reset = useCallback((newValues?: Partial<T>) => {
    setValuesState((prev) => ({ ...prev, ...newValues }));
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, []);

  // 计算表单是否有效
  const isValid = Object.keys(errors).length === 0;

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    setValue,
    setError,
    clearError,
    clearAllErrors,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    validate,
    setValues: setValuesState,
  };
}

// 常用验证规则
export const validationRules = {
  required: (message = '此字段为必填项') => ({
    validator: (value: any) =>
      value !== null && value !== undefined && value !== '',
    message,
  }),

  email: (message = '请输入有效的邮箱地址') => ({
    validator: (value: string) => {
      if (!value) return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message,
  }),

  minLength: (min: number, message?: string) => ({
    validator: (value: string) => {
      if (!value) return true;
      return value.length >= min;
    },
    message: message || `至少需要 ${min} 个字符`,
  }),

  maxLength: (max: number, message?: string) => ({
    validator: (value: string) => {
      if (!value) return true;
      return value.length <= max;
    },
    message: message || `最多只能输入 ${max} 个字符`,
  }),

  password: (
    message = '密码至少包含8个字符，包括大小写字母和数字'
  ) => ({
    validator: (value: string) => {
      if (!value) return true;
      const hasUpperCase = /[A-Z]/.test(value);
      const hasLowerCase = /[a-z]/.test(value);
      const hasNumber = /[0-9]/.test(value);
      const hasMinLength = value.length >= 8;
      return hasUpperCase && hasLowerCase && hasNumber && hasMinLength;
    },
    message,
  }),

  match: (matchField: string, message?: string) => ({
    validator: (value: string, values: any) => {
      return value === values[matchField];
    },
    message: message || '两次输入的密码不匹配',
  }),

  phone: (message = '请输入有效的手机号码') => ({
    validator: (value: string) => {
      if (!value) return true;
      const phoneRegex = /^1[3-9]\d{9}$/;
      return phoneRegex.test(value);
    },
    message,
  }),
};
