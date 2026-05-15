import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Papa from 'papaparse';

const ExportPanel = ({ onExport, loading }) => {
  const { t } = useTranslation();
  const [selectedFormat, setSelectedFormat] = useState('csv');
  const [exporting, setExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState([]);

  const formats = [
    {
      id: 'csv',
      name: 'CSV',
      icon: '📊',
      description: 'Comma-separated values for spreadsheet applications',
      fileSize: 'Small'
    },
    {
      id: 'excel',
      name: 'Excel',
      icon: '📈',
      description: 'Microsoft Excel format with formatting support',
      fileSize: 'Medium'
    },
    {
      id: 'json',
      name: 'JSON',
      icon: '{ }',
      description: 'JavaScript Object Notation for developers',
      fileSize: 'Medium'
    },
    {
      id: 'pdf',
      name: 'PDF',
      icon: '📄',
      description: 'Portable Document Format for sharing',
      fileSize: 'Large'
    }
  ];

  const handleExport = async () => {
    setExporting(true);
    try {
      await onExport(selectedFormat);
      setExportHistory(prev => [
        {
          id: Date.now(),
          format: selectedFormat,
          timestamp: new Date().toISOString(),
          status: 'success'
        },
        ...prev.slice(0, 9)
      ]);
    } catch (error) {
      console.error('Export failed:', error);
      setExportHistory(prev => [
        {
          id: Date.now(),
          format: selectedFormat,
          timestamp: new Date().toISOString(),
          status: 'failed',
          error: error.message
        },
        ...prev.slice(0, 9)
      ]);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="export-panel">
      <div className="panel-header">
        <h2>{t('analytics.export.title', 'Data Export')}</h2>
        <p>{t('analytics.export.description', 'Export your analytics data in various formats')}</p>
      </div>

      <div className="export-content">
        <div className="format-selection">
          <h3>{t('analytics.export.selectFormat', 'Select Format')}</h3>
          <div className="format-grid">
            {formats.map(format => (
              <div
                key={format.id}
                className={`format-card ${selectedFormat === format.id ? 'selected' : ''}`}
                onClick={() => setSelectedFormat(format.id)}
              >
                <div className="format-icon">{format.icon}</div>
                <div className="format-info">
                  <div className="format-name">{format.name}</div>
                  <div className="format-description">{format.description}</div>
                  <div className="format-size">Size: {format.fileSize}</div>
                </div>
                {selectedFormat === format.id && (
                  <div className="format-check">✓</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="export-actions">
          <button
            className="export-button"
            onClick={handleExport}
            disabled={exporting || loading}
          >
            {exporting ? (
              <>
                <span className="spinner"></span>
                {t('analytics.export.exporting', 'Exporting...')}
              </>
            ) : (
              <>
                <span className="export-icon">📥</span>
                {t('analytics.export.button', 'Export Data')}
              </>
            )}
          </button>
        </div>

        {exportHistory.length > 0 && (
          <div className="export-history">
            <h3>{t('analytics.export.history', 'Export History')}</h3>
            <div className="history-list">
              {exportHistory.map(item => (
                <div key={item.id} className={`history-item ${item.status}`}>
                  <div className="history-info">
                    <span className="history-format">{item.format.toUpperCase()}</span>
                    <span className="history-time">
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className={`history-status ${item.status}`}>
                    {item.status === 'success' ? '✓' : '✗'}
                    {item.status === 'success' ? 'Success' : 'Failed'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="export-info">
          <h3>{t('analytics.export.info.title', 'Export Information')}</h3>
          <ul>
            <li>
              <strong>CSV:</strong> {t('analytics.export.info.csv', 'Best for importing into spreadsheet applications like Excel or Google Sheets. Contains raw data without formatting.')}
            </li>
            <li>
              <strong>Excel:</strong> {t('analytics.export.info.excel', 'Native Excel format with multiple worksheets and basic formatting. Ideal for detailed data analysis.')}
            </li>
            <li>
              <strong>JSON:</strong> {t('analytics.export.info.json', 'Structured data format perfect for developers and integration with other systems.')}
            </li>
            <li>
              <strong>PDF:</strong> {t('analytics.export.info.pdf', 'Print-ready format with charts and formatted text. Best for sharing reports with stakeholders.')}
            </li>
          </ul>
        </div>
      </div>

      <style jsx>{`
        .export-panel {
          padding: 40px;
        }

        .panel-header {
          margin-bottom: 30px;
        }

        .panel-header h2 {
          margin: 0 0 8px 0;
          font-size: 24px;
          color: #333;
        }

        .panel-header p {
          margin: 0;
          color: #666;
          font-size: 14px;
        }

        .export-content {
          max-width: 800px;
        }

        .format-selection {
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }

        .format-selection h3 {
          margin: 0 0 20px 0;
          font-size: 16px;
          color: #333;
          font-weight: 600;
        }

        .format-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .format-card {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 20px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }

        .format-card:hover {
          border-color: #8884d8;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }

        .format-card.selected {
          border-color: #8884d8;
          background: #f8f7fc;
        }

        .format-icon {
          font-size: 32px;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f5f5f5;
          border-radius: 8px;
        }

        .format-info {
          flex: 1;
        }

        .format-name {
          font-size: 18px;
          font-weight: 600;
          color: #333;
          margin-bottom: 4px;
        }

        .format-description {
          font-size: 13px;
          color: #666;
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .format-size {
          font-size: 11px;
          color: #888;
        }

        .format-check {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 24px;
          height: 24px;
          background: #8884d8;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: bold;
        }

        .export-actions {
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }

        .export-button {
          width: 100%;
          padding: 16px 32px;
          background: #8884d8;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .export-button:hover:not(:disabled) {
          background: #7b75c6;
        }

        .export-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .export-icon {
          font-size: 24px;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .export-history {
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }

        .export-history h3 {
          margin: 0 0 20px 0;
          font-size: 16px;
          color: #333;
          font-weight: 600;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .history-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #f9f9f9;
          border-radius: 6px;
          border-left: 4px solid #ccc;
        }

        .history-item.success {
          border-left-color: #22c55e;
        }

        .history-item.failed {
          border-left-color: #ef4444;
        }

        .history-info {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .history-format {
          font-weight: 600;
          color: #333;
        }

        .history-time {
          font-size: 13px;
          color: #666;
        }

        .history-status {
          font-size: 13px;
          font-weight: 500;
        }

        .history-status.success {
          color: #22c55e;
        }

        .history-status.failed {
          color: #ef4444;
        }

        .export-info {
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .export-info h3 {
          margin: 0 0 16px 0;
          font-size: 16px;
          color: #333;
          font-weight: 600;
        }

        .export-info ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .export-info li {
          padding: 12px 0;
          border-bottom: 1px solid #e0e0e0;
          color: #666;
          line-height: 1.6;
        }

        .export-info li:last-child {
          border-bottom: none;
        }

        .export-info li strong {
          color: #333;
        }

        @media (max-width: 768px) {
          .format-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default ExportPanel;
