import React from 'react';
import Table from './Table';

export default {
  title: 'UI/Table',
  component: Table,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    loading: {
      control: 'boolean',
    },
  },
};

const sampleColumns = [
  { title: '姓名', dataIndex: 'name', width: '150px' },
  { title: '年龄', dataIndex: 'age', width: '100px' },
  { title: '邮箱', dataIndex: 'email' },
  { title: '状态', dataIndex: 'status', width: '100px' },
];

const sampleData = [
  { name: '张三', age: 28, email: 'zhangsan@example.com', status: '活跃' },
  { name: '李四', age: 32, email: 'lisi@example.com', status: '离线' },
  { name: '王五', age: 25, email: 'wangwu@example.com', status: '活跃' },
  { name: '赵六', age: 30, email: 'zhaoliu@example.com', status: '离开' },
  { name: '钱七', age: 27, email: 'qianqi@example.com', status: '活跃' },
];

export const Default = {
  args: {
    columns: sampleColumns,
    data: sampleData,
  },
};

export const WithRender = {
  args: {
    columns: [
      { title: '姓名', dataIndex: 'name', width: '150px' },
      { title: '年龄', dataIndex: 'age', width: '100px' },
      { title: '邮箱', dataIndex: 'email' },
      { 
        title: '状态', 
        dataIndex: 'status', 
        width: '100px',
        render: (text) => {
          const color = text === '活跃' ? 'green' : text === '离线' ? 'gray' : 'orange';
          return <span style={{ color }}>{text}</span>;
        }
      },
    ],
    data: sampleData,
  },
};

export const Empty = {
  args: {
    columns: sampleColumns,
    data: [],
  },
};

export const Loading = {
  args: {
    columns: sampleColumns,
    data: sampleData,
    loading: true,
  },
};

export const CustomEmptyText = {
  args: {
    columns: sampleColumns,
    data: [],
    emptyText: '没有找到相关数据',
  },
};

export const ClickableRow = {
  args: {
    columns: sampleColumns,
    data: sampleData,
    onRowClick: (row) => console.log('Row clicked:', row),
  },
};
