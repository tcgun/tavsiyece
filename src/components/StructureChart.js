"use client"; 

import { Chart as ChartJS, ArcElement, Tooltip, Legend, DoughnutController } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, DoughnutController);

export default function StructureChart({ categories }) {
  const chartLabels = categories.map(c => c.name.replace(' (Listeler)', ''));
  const chartData = categories.map(c => c.files.length);

  const data = {
    labels: chartLabels,
    datasets: [{
      label: 'Sayfa Sayısı',
      data: chartData,
      backgroundColor: [
        '#14B8A6', '#0D9488', '#0F766E', '#115E59', '#042F2E', '#A7F3D0'
      ],
      borderColor: '#FDFBF8',
      borderWidth: 4,
      hoverOffset: 8
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
              label += context.parsed + ' sayfa';
            }
            return label;
          }
        },
        backgroundColor: '#403A3A',
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 6,
        displayColors: false
      }
    },
    cutout: '65%'
  };

  return <Doughnut data={data} options={options} />;
}