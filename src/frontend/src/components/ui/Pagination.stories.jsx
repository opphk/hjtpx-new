import React, { useState } from 'react';
import Pagination from './Pagination';

export default {
  title: 'UI/Pagination',
  component: Pagination,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    current: {
      control: 'number',
    },
    total: {
      control: 'number',
    },
    pageSize: {
      control: 'number',
    },
    showTotal: {
      control: 'boolean',
    },
  },
};

const Template = (args) => {
  const [current, setCurrent] = useState(args.current || 1);
  return (
    <Pagination
      {...args}
      current={current}
      onChange={setCurrent}
    />
  );
};

export const Default = Template.bind({});
Default.args = {
  current: 1,
  total: 50,
  pageSize: 10,
};

export const CurrentPage3 = Template.bind({});
CurrentPage3.args = {
  current: 3,
  total: 50,
  pageSize: 10,
};

export const ManyPages = Template.bind({});
ManyPages.args = {
  current: 10,
  total: 200,
  pageSize: 10,
};

export const WithoutTotal = Template.bind({});
WithoutTotal.args = {
  current: 2,
  total: 50,
  pageSize: 10,
  showTotal: false,
};

export const SmallDataSet = Template.bind({});
SmallDataSet.args = {
  current: 1,
  total: 15,
  pageSize: 10,
};
