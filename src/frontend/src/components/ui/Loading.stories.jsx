import React from 'react';
import Loading from './Loading';

export default {
  title: 'UI/Loading',
  component: Loading,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
    fullScreen: {
      control: 'boolean',
    },
  },
};

export const Default = {
  args: {},
};

export const Small = {
  args: {
    size: 'small',
  },
};

export const Large = {
  args: {
    size: 'large',
  },
};

export const WithCustomText = {
  args: {
    text: '正在处理数据...',
  },
};

export const WithoutText = {
  args: {
    text: '',
  },
};

export const AllSizes = {
  render: () => (
    <div style={{ display: 'flex', gap: '48px', alignItems: 'center' }}>
      <Loading size="small" text="小" />
      <Loading size="medium" text="中" />
      <Loading size="large" text="大" />
    </div>
  ),
};
