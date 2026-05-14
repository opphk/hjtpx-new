import React, { useState } from 'react';
import Input from './Input';

export default {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url'],
    },
    disabled: {
      control: 'boolean',
    },
    required: {
      control: 'boolean',
    },
  },
};

const Template = (args) => {
  const [value, setValue] = useState('');
  return (
    <Input
      {...args}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
};

export const Default = Template.bind({});
Default.args = {
  label: '用户名',
  placeholder: '请输入用户名',
  name: 'username',
};

export const WithValue = Template.bind({});
WithValue.args = {
  label: '邮箱',
  placeholder: '请输入邮箱',
  type: 'email',
  value: 'user@example.com',
  name: 'email',
};

export const WithError = Template.bind({});
WithError.args = {
  label: '密码',
  type: 'password',
  placeholder: '请输入密码',
  error: '密码长度至少为 6 位',
  name: 'password',
};

export const Disabled = Template.bind({});
Disabled.args = {
  label: '禁用输入框',
  placeholder: '无法输入',
  disabled: true,
  name: 'disabled',
};

export const Required = Template.bind({});
Required.args = {
  label: '必填字段',
  placeholder: '这是必填字段',
  required: true,
  name: 'required',
};

export const AllTypes = {
  render: () => {
    const [values, setValues] = useState({});
    const handleChange = (name) => (e) => {
      setValues({ ...values, [name]: e.target.value });
    };
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <Input
          label="文本输入"
          type="text"
          placeholder="请输入文本"
          name="text"
          value={values.text || ''}
          onChange={handleChange('text')}
        />
        <Input
          label="邮箱"
          type="email"
          placeholder="请输入邮箱"
          name="email"
          value={values.email || ''}
          onChange={handleChange('email')}
        />
        <Input
          label="密码"
          type="password"
          placeholder="请输入密码"
          name="password"
          value={values.password || ''}
          onChange={handleChange('password')}
        />
        <Input
          label="数字"
          type="number"
          placeholder="请输入数字"
          name="number"
          value={values.number || ''}
          onChange={handleChange('number')}
        />
      </div>
    );
  },
};
