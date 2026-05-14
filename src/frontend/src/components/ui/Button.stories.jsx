import React from 'react';
import Button from './Button';

export default {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'success', 'warning'],
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
    disabled: {
      control: 'boolean',
    },
    loading: {
      control: 'boolean',
    },
    type: {
      control: 'select',
      options: ['button', 'submit', 'reset'],
    },
    onClick: {
      action: 'clicked',
    },
  },
};

export const Primary = {
  args: {
    variant: 'primary',
    children: '主按钮',
  },
};

export const Secondary = {
  args: {
    variant: 'secondary',
    children: '次按钮',
  },
};

export const Danger = {
  args: {
    variant: 'danger',
    children: '危险按钮',
  },
};

export const Success = {
  args: {
    variant: 'success',
    children: '成功按钮',
  },
};

export const Small = {
  args: {
    size: 'small',
    children: '小按钮',
  },
};

export const Large = {
  args: {
    size: 'large',
    children: '大按钮',
  },
};

export const Disabled = {
  args: {
    disabled: true,
    children: '禁用按钮',
  },
};

export const Loading = {
  args: {
    loading: true,
    children: '加载中',
  },
};

export const AllVariants = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      <Button variant="primary">主按钮</Button>
      <Button variant="secondary">次按钮</Button>
      <Button variant="success">成功按钮</Button>
      <Button variant="warning">警告按钮</Button>
      <Button variant="danger">危险按钮</Button>
    </div>
  ),
};
