import React from 'react';
import Skeleton, { 
  SkeletonText, 
  SkeletonTitle, 
  SkeletonAvatar, 
  SkeletonCard, 
  SkeletonTable, 
  SkeletonList,
  SkeletonForm 
} from './Skeleton';

export default {
  title: 'UI/Skeleton',
  component: Skeleton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    width: {
      control: 'text',
    },
    height: {
      control: 'text',
    },
    borderRadius: {
      control: 'text',
    },
  },
};

export const Default = {
  args: {},
};

export const CustomSize = {
  args: {
    width: '300px',
    height: '40px',
  },
};

export const Text = {
  render: () => <SkeletonText lines={4} lastLineWidth="50%" />,
};

export const Title = {
  render: () => <SkeletonTitle width="50%" />,
};

export const Avatar = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px' }}>
      <SkeletonAvatar size={32} />
      <SkeletonAvatar size={48} />
      <SkeletonAvatar size={64} />
    </div>
  ),
};

export const Card = {
  render: () => (
    <div style={{ width: '400px' }}>
      <SkeletonCard showAvatar showImage />
    </div>
  ),
};

export const Table = {
  render: () => (
    <div style={{ width: '800px' }}>
      <SkeletonTable rows={5} columns={4} />
    </div>
  ),
};

export const List = {
  render: () => (
    <div style={{ width: '500px' }}>
      <SkeletonList items={3} />
    </div>
  ),
};

export const Form = {
  render: () => (
    <div style={{ width: '400px' }}>
      <SkeletonForm fields={4} />
    </div>
  ),
};

export const AllComponents = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '600px' }}>
      <div>
        <h4>基础 Skeleton</h4>
        <Skeleton width="200px" height="20px" />
      </div>
      <div>
        <h4>SkeletonText</h4>
        <SkeletonText lines={3} />
      </div>
      <div>
        <h4>SkeletonCard</h4>
        <SkeletonCard showAvatar />
      </div>
    </div>
  ),
};
