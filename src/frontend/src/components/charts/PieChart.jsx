import React, { useRef } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie, Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const PieChartComponent = ({ 
  data = [], 
  nameKey = 'name', 
  valueKey = 'value',
  title = '',
  height = 300,
  showLegend = true,
  legendPosition = 'right',
  type = 'pie',
  colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28', '#FF8042', '#888888'],
  showPercentage = true,
  showValue = false,
  loading = false
}) => {
  const chartRef = useRef(null);

  const chartColors = colors.slice(0, data.length);

  const chartData = {
    labels: data.map(item => item[nameKey]),
    datasets: [
      {
        data: data.map(item => item[valueKey]),
        backgroundColor: chartColors.map(color => `${color}cc`),
        borderColor: chartColors,
        borderWidth: 2,
        hoverBackgroundColor: chartColors,
        hoverBorderColor: '#fff',
        hoverBorderWidth: 3
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: legendPosition,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12
          },
          generateLabels: function(chart) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label, i) => {
                const meta = chart.getDatasetMeta(0);
                const style = meta.controller.getStyle(i);
                const value = data.datasets[0].data[i];
                const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);

                let text = label;
                if (showPercentage) {
                  text += ` (${percentage}%)`;
                }
                if (showValue) {
                  text += `: ${value.toLocaleString()}`;
                }

                return {
                  text,
                  fillStyle: style.backgroundColor,
                  strokeStyle: style.borderColor,
                  lineWidth: style.borderWidth,
                  hidden: !chart.getDataVisibility(i),
                  index: i
                };
              });
            }
            return [];
          }
        }
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: 16,
          weight: 'bold'
        },
        padding: {
          bottom: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 13
        },
        callbacks: {
          label: function(context) {
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${context.label}: ${value.toLocaleString()} (${percentage}%)`;
          }
        }
      }
    },
    animation: {
      duration: 750,
      easing: 'easeInOutQuart'
    },
    cutout: type === 'doughnut' ? '60%' : 0
  };

  if (loading) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: '8px' }}>
        <span>Loading...</span>
      </div>
    );
  }

  const ChartComponent = type === 'doughnut' ? Doughnut : Pie;

  return (
    <div style={{ height }}>
      <ChartComponent ref={chartRef} data={chartData} options={options} />
    </div>
  );
};

export default PieChartComponent;
