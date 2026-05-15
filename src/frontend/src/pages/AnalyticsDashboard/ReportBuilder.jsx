import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const ReportBuilder = ({ onGenerateReport }) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState({
    template: 'detailed',
    title: '',
    sections: ['summary', 'activityByDay', 'topEvents', 'userEngagement'],
    period: { days: 7 },
    includeCharts: true
  });
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState(null);

  const templates = [
    { id: 'summary', name: t('analytics.report.templates.summary', 'Summary Report'), description: 'Overview of key metrics' },
    { id: 'detailed', name: t('analytics.report.templates.detailed', 'Detailed Analytics'), description: 'Comprehensive analysis' },
    { id: 'executive', name: t('analytics.report.templates.executive', 'Executive Summary'), description: 'High-level overview' },
    { id: 'custom', name: t('analytics.report.templates.custom', 'Custom Report'), description: 'User-defined metrics' }
  ];

  const sections = [
    { id: 'summary', name: t('analytics.report.sections.summary', 'Summary Statistics'), description: 'Key metrics overview' },
    { id: 'activityByDay', name: t('analytics.report.sections.activityByDay', 'Daily Activity'), description: 'Activity broken down by day' },
    { id: 'topEvents', name: t('analytics.report.sections.topEvents', 'Top Events'), description: 'Most frequent events' },
    { id: 'userEngagement', name: t('analytics.report.sections.userEngagement', 'User Engagement'), description: 'User behavior metrics' },
    { id: 'deviceBreakdown', name: t('analytics.report.sections.deviceBreakdown', 'Device Breakdown'), description: 'Device and browser statistics' },
    { id: 'geographicData', name: t('analytics.report.sections.geographicData', 'Geographic Data'), description: 'Location-based analytics' },
    { id: 'funnels', name: t('analytics.report.sections.funnels', 'Funnel Analysis'), description: 'Conversion funnels' },
    { id: 'cohorts', name: t('analytics.report.sections.cohorts', 'Cohort Analysis'), description: 'User cohort retention' }
  ];

  const handleTemplateChange = (templateId) => {
    setConfig(prev => ({ ...prev, template: templateId }));

    if (templateId === 'custom') {
      setConfig(prev => ({ ...prev, sections: [] }));
    } else {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        const defaultSections = {
          summary: ['summary'],
          detailed: ['summary', 'activityByDay', 'topEvents', 'userEngagement'],
          executive: ['summary', 'trends', 'keyInsights']
        };
        setConfig(prev => ({ ...prev, sections: defaultSections[templateId] || ['summary'] }));
      }
    }
  };

  const handleSectionToggle = (sectionId) => {
    setConfig(prev => {
      const newSections = prev.sections.includes(sectionId)
        ? prev.sections.filter(s => s !== sectionId)
        : [...prev.sections, sectionId];
      return { ...prev, sections: newSections };
    });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const report = await onGenerateReport(config);
      setPreview(report);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="report-builder">
      <div className="builder-header">
        <h2>{t('analytics.report.title', 'Report Builder')}</h2>
        <p>{t('analytics.report.description', 'Create custom analytics reports')}</p>
      </div>

      <div className="builder-content">
        <div className="config-panel">
          <div className="config-section">
            <h3>{t('analytics.report.template', 'Template')}</h3>
            <div className="template-grid">
              {templates.map(template => (
                <div
                  key={template.id}
                  className={`template-card ${config.template === template.id ? 'selected' : ''}`}
                  onClick={() => handleTemplateChange(template.id)}
                >
                  <div className="template-name">{template.name}</div>
                  <div className="template-description">{template.description}</div>
                </div>
              ))}
            </div>
          </div>

          {config.template === 'custom' && (
            <div className="config-section">
              <h3>{t('analytics.report.sections', 'Sections')}</h3>
              <div className="sections-grid">
                {sections.map(section => (
                  <label key={section.id} className="section-checkbox">
                    <input
                      type="checkbox"
                      checked={config.sections.includes(section.id)}
                      onChange={() => handleSectionToggle(section.id)}
                    />
                    <div className="section-info">
                      <div className="section-name">{section.name}</div>
                      <div className="section-description">{section.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="config-section">
            <h3>{t('analytics.report.settings', 'Settings')}</h3>
            <div className="settings-form">
              <div className="form-group">
                <label>{t('analytics.report.reportTitle', 'Report Title')}</label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
                  placeholder={t('analytics.report.enterTitle', 'Enter report title')}
                />
              </div>

              <div className="form-group">
                <label>{t('analytics.report.timeRange', 'Time Range')}</label>
                <select
                  value={config.period.days}
                  onChange={(e) => setConfig(prev => ({ ...prev, period: { days: parseInt(e.target.value) } }))}
                >
                  <option value={7}>7 {t('analytics.report.days', 'Days')}</option>
                  <option value={14}>14 {t('analytics.report.days', 'Days')}</option>
                  <option value={30}>30 {t('analytics.report.days', 'Days')}</option>
                  <option value={90}>90 {t('analytics.report.days', 'Days')}</option>
                </select>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={config.includeCharts}
                    onChange={(e) => setConfig(prev => ({ ...prev, includeCharts: e.target.checked }))}
                  />
                  {t('analytics.report.includeCharts', 'Include Charts')}
                </label>
              </div>
            </div>
          </div>

          <button
            className="generate-button"
            onClick={handleGenerate}
            disabled={generating || config.sections.length === 0}
          >
            {generating ? t('analytics.report.generating', 'Generating...') : t('analytics.report.generate', 'Generate Report')}
          </button>
        </div>

        {preview && (
          <div className="preview-panel">
            <h3>{t('analytics.report.preview', 'Report Preview')}</h3>
            <div className="preview-content">
              <div className="preview-meta">
                <strong>{preview.meta?.title}</strong>
                <span>{preview.meta?.generatedAt}</span>
              </div>
              {preview.data?.summary && (
                <div className="preview-section">
                  <h4>{t('analytics.report.summary', 'Summary')}</h4>
                  <div className="preview-stats">
                    <div>Total Events: {preview.data.summary.totalEvents}</div>
                    <div>Unique Users: {preview.data.summary.uniqueUsers}</div>
                    <div>Sessions: {preview.data.summary.totalSessions}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .report-builder {
          padding: 40px;
        }

        .builder-header {
          margin-bottom: 30px;
        }

        .builder-header h2 {
          margin: 0 0 8px 0;
          font-size: 24px;
          color: #333;
        }

        .builder-header p {
          margin: 0;
          color: #666;
          font-size: 14px;
        }

        .builder-content {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 30px;
        }

        .config-panel {
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .config-section {
          margin-bottom: 30px;
        }

        .config-section:last-of-type {
          margin-bottom: 20px;
        }

        .config-section h3 {
          margin: 0 0 16px 0;
          font-size: 16px;
          color: #333;
          font-weight: 600;
        }

        .template-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .template-card {
          padding: 16px;
          border: 2px solid #e0e0e0;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .template-card:hover {
          border-color: #8884d8;
        }

        .template-card.selected {
          border-color: #8884d8;
          background: #f8f7fc;
        }

        .template-name {
          font-weight: 600;
          color: #333;
          margin-bottom: 4px;
        }

        .template-description {
          font-size: 12px;
          color: #666;
        }

        .sections-grid {
          display: grid;
          gap: 12px;
        }

        .section-checkbox {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .section-checkbox:hover {
          border-color: #8884d8;
        }

        .section-checkbox input {
          margin-top: 3px;
        }

        .section-name {
          font-weight: 500;
          color: #333;
        }

        .section-description {
          font-size: 12px;
          color: #666;
          margin-top: 2px;
        }

        .settings-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 500;
          color: #333;
        }

        .form-group input[type="text"],
        .form-group select {
          padding: 10px 12px;
          border: 1px solid #d0d0d0;
          border-radius: 6px;
          font-size: 14px;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #8884d8;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .generate-button {
          width: 100%;
          padding: 14px;
          background: #8884d8;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .generate-button:hover:not(:disabled) {
          background: #7b75c6;
        }

        .generate-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .preview-panel {
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          height: fit-content;
        }

        .preview-panel h3 {
          margin: 0 0 20px 0;
          font-size: 18px;
          color: #333;
        }

        .preview-content {
          font-size: 14px;
        }

        .preview-meta {
          display: flex;
          justify-content: space-between;
          padding-bottom: 16px;
          border-bottom: 1px solid #e0e0e0;
          margin-bottom: 16px;
        }

        .preview-section h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #333;
        }

        .preview-stats {
          display: flex;
          flex-direction: column;
          gap: 8px;
          color: #666;
        }

        @media (max-width: 1024px) {
          .builder-content {
            grid-template-columns: 1fr;
          }

          .template-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default ReportBuilder;
