import React from 'react';

const Skeleton = ({ width, height, borderRadius = '4px', style = {} }) => {
  return (
    <div
      className="skeleton"
      style={{
        width: width || '100%',
        height: height || '16px',
        borderRadius,
        ...style
      }}
    />
  );
};

export const SkeletonText = ({ lines = 3, lastLineWidth = '60%' }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height="16px"
          width={index === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  );
};

export const SkeletonTitle = ({ width = '40%' }) => {
  return <Skeleton height="24px" width={width} />;
};

export const SkeletonAvatar = ({ size = 48 }) => {
  return <Skeleton width={size} height={size} borderRadius="50%" />;
};

export const SkeletonCard = ({ showAvatar = false, showImage = false }) => {
  return (
    <div className="skeleton-card">
      {showImage && <div className="skeleton-image" />}
      {showAvatar && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <SkeletonAvatar />
          <div style={{ flex: 1 }}>
            <SkeletonText lines={2} />
          </div>
        </div>
      )}
      {!showAvatar && <SkeletonTitle />}
      <SkeletonText lines={3} />
    </div>
  );
};

export const SkeletonTable = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="skeleton-card" style={{ padding: 0 }}>
      <div style={{ display: 'flex', gap: '16px', padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} height="20px" style={{ flex: 1 }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            display: 'flex',
            gap: '16px',
            padding: '16px',
            borderBottom: rowIndex < rows - 1 ? '1px solid #f0f0f0' : 'none'
          }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} height="16px" style={{ flex: 1 }} />
          ))}
        </div>
      ))}
    </div>
  );
};

export const SkeletonList = ({ items = 3 }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            gap: '12px',
            padding: '16px',
            background: 'white',
            borderRadius: '6px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}
        >
          <SkeletonAvatar />
          <div style={{ flex: 1 }}>
            <SkeletonText lines={2} />
          </div>
        </div>
      ))}
    </div>
  );
};

export const SkeletonForm = ({ fields = 3 }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index}>
          <Skeleton height="16px" width="100px" style={{ marginBottom: '8px' }} />
          <Skeleton height="40px" />
        </div>
      ))}
      <Skeleton height="44px" width="200px" style={{ marginTop: '8px' }} />
    </div>
  );
};

export default Skeleton;
