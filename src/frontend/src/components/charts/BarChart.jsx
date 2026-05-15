import React, { useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const BarChartComponent = ({ 
  data = [], 
  xKey = 'name', 
  yKeys = ['value'],
  title = '',
  height = 300,
  showGrid = true,
  showLegend = true,
  horizontal = false,
  stacked = false,
  colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F'],
  unit = '',
  loading = false
}) => {
  const chartRef = useRef(null);

  const datasets = yKeys.map((key, index) => ({
    label: key,
    data: data.map(item => item[key]),
    backgroundColor: colors[index % colors.length],
    borderColor: colors[index % colors.length],
    borderWidth: 1,
    borderRadius: 4,
    hoverBackgroundColor: colors[index % colors.length],
    barThickness: 'flex',
    maxBarThickness: 50
  }));

  const chartData = {
    labels: data.map(item => item[xKey]),
    datasets
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' : 'x',
    plugins: {
      legend: {
        display: showLegend && yKeys.length > 1,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
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
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed[horizontal ? 'x' : 'y'] !== null) {
              const value = horizontal ? context.parsed.x : context.parsed.y;
              label += value.toLocaleString();
              if (unit) {
                label += ` ${unit}`;
              }
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        stacked: stacked,
        grid: {
          display: !horizontal && showGrid,
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          maxRotation: 45,
          minRotation: 0,
          font: {
            size: 11
          }
        }
      },
      y: {
        display: true,
        stacked: stacked,
        grid: {
          display: horizontal || showGrid,
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          font: {
            size: 11
          },
          callback: function(value) {
            if (unit === '%') {
              return value + '%';
            }
            if (value >= 1000) {
              return (value / 1000).toFixed(1) + 'k';
            }
            return value;
          }
        },
        beginAtZero: true
      }
    },
    animation: {
      duration: 750,
      easing: 'easeInOutQuart'
    }
  };

  if (loading) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: '8px' }}>
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <Bar ref={chartRef} data={chartData} options={options} />
    </div>
  );
};

export default BarChartComponent;
