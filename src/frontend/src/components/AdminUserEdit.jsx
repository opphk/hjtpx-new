import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';

const AdminUserEdit = ({ isOpen, onClose, user, onSave }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user',
    status: 'active'
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        password: '',
        role: user.role || 'user',
        status: user.status || 'active'
      });
    } else {
      setFormData({
        username: '',
        email: '',
        password: '',
        role: 'user',
        status: 'active'
      });
    }
    setErrors({});
  }, [user, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = '用户名不能为空';
    } else if (formData.username.length < 3) {
      newErrors.username = '用户名至少需要3个字符';
    }

    if (!formData.email.trim()) {
      newErrors.email = '邮箱不能为空';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址';
    }

    if (!user && !formData.password.trim()) {
      newErrors.password = '密码不能为空';
    } else if (!user && formData.password.length < 6) {
      newErrors.password = '密码至少需要6个字符';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const submitData = { ...formData };
      if (!submitData.password) {
        delete submitData.password;
      }
      await onSave(submitData);
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>
        取消
      </Button>
      <Button
        variant="primary"
        onClick={handleSubmit}
        loading={loading}
      >
        {user ? '保存' : '创建'}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? '编辑用户' : '创建用户'}
      footer={footer}
      size="medium"
    >
      <div className="user-edit-form">
        <Input
          label="用户名"
          name="username"
          value={formData.username}
          onChange={handleChange}
          error={errors.username}
          required
          placeholder="输入用户名"
        />

        <Input
          label="邮箱"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          required
          placeholder="输入邮箱地址"
        />

        <Input
          label={user ? '密码 (留空则不修改)' : '密码'}
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          required={!user}
          placeholder={user ? '留空保持原密码' : '输入密码'}
        />

        <div className="form-group">
          <label className="form-label">角色</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="form-select"
            disabled={user && user.role === 'admin'}
          >
            <option value="admin">管理员</option>
            <option value="user">普通用户</option>
            <option value="guest">访客</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">状态</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="form-select"
          >
            <option value="active">激活</option>
            <option value="inactive">禁用</option>
            <option value="pending">待验证</option>
          </select>
        </div>
      </div>
    </Modal>
  );
};

export default AdminUserEdit;
