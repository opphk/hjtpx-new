import React, { useState } from 'react';
import Modal from './Modal';
import Button from './Button';

export default {
  title: 'UI/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      control: 'boolean',
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
  },
};

const Template = (args) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>打开弹窗</Button>
      <Modal
        {...args}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};

export const Default = Template.bind({});
Default.args = {
  title: '默认弹窗',
  children: <p>这是弹窗的内容区域，可以放置任何内容。</p>,
};

export const WithFooter = Template.bind({});
WithFooter.args = {
  title: '带底部按钮的弹窗',
  children: <p>这是弹窗的内容区域，底部有操作按钮。</p>,
  footer: (
    <div style={{ display: 'flex', gap: '12px' }}>
      <Button variant="secondary">取消</Button>
      <Button variant="primary">确定</Button>
    </div>
  ),
};

export const Small = Template.bind({});
Small.args = {
  size: 'small',
  title: '小弹窗',
  children: <p>这是小尺寸的弹窗。</p>,
};

export const Large = Template.bind({});
Large.args = {
  size: 'large',
  title: '大弹窗',
  children: (
    <div>
      <p>这是大尺寸的弹窗，可以容纳更多内容。</p>
      <p style={{ marginTop: '16px' }}>支持放置多行文本、表单等复杂内容。</p>
    </div>
  ),
};
