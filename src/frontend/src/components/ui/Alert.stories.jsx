import React, { useState } from 'react';
import Alert from './Alert';

export default {
  title: 'UI/Alert',
  component: Alert,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['info', 'success', 'warning', 'error'],
    },
    closable: {
      control: 'boolean',
    },
  },
};

export const Info = {
  args: {
    type: 'info',
    message: '这是一条信息提示',
  },
};

export const Success = {
  args: {
    type: 'success',
    message: '操作成功！',
  },
};

export const Warning = {
  args: {
    type: 'warning',
    message: '请注意此操作',
  },
};

export const Error = {
  args: {
    type: 'error',
    message: '操作失败！',
  },
};

export const WithDescription = {
  args: {
    type: 'info',
    message: '提示标题',
    description: '这是详细的描述信息，用于更完整地说明问题。',
  },
};

export const Closable = {
  render: () => {
    const [visible, setVisible] = useState(true);
    
    if (!visible) return <button onClick={() => setVisible(true)}>重新显示 Alert</button>;
    
    return (
      <Alert
        type="info"
        message="可关闭的提示"
        description="点击右上角的关闭按钮可以隐藏此提示。"
        closable
        onClose={() => setVisible(false)}
      />
    );
  },
};

export const AllTypes = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Alert type="info" message="信息提示" description="这是一条普通的信息提示" />
      <Alert type="success" message="成功提示" description="操作成功完成！" />
      <Alert type="warning" message="警告提示" description="请注意，此操作可能有风险！" />
      <Alert type="error" message="错误提示" description="操作失败，请重试！" />
    </div>
  ),
};
