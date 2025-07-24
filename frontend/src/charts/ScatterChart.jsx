import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import CustomSelect from '../components/CustomSelect';

ChartJS.register(
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend
);

function ScatterChart({ columns, data, chartState, updateChartState }) {
  const xAxis = chartState?.xAxis || '';
  const yAxis = chartState?.yAxis || '';

  const setXAxis = (value) => updateChartState('xAxis', value);
  const setYAxis = (value) => updateChartState('yAxis', value);

  // 数値データの列のみを抽出
  const numericColumns = useMemo(() => {
    if (data.length === 0) return [];
    
    return columns.filter(column => {
      return data.every(row => {
        const value = row[column];
        if (value === null || String(value).trim() === '') return false;
        return !isNaN(Number(value)) && isFinite(Number(value));
      });
    });
  }, [columns, data]);

  // 散布図のデータを生成
  const chartData = useMemo(() => {
    if (!xAxis || !yAxis || data.length === 0) {
      return { datasets: [] };
    }

    const points = data.map(row => ({
      x: Number(row[xAxis]),
      y: Number(row[yAxis])
    })).filter(point => !isNaN(point.x) && !isNaN(point.y));

    return {
      datasets: [{
        label: `${yAxis} vs ${xAxis}`,
        data: points,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
        pointRadius: 3,
        pointHoverRadius: 5,
      }]
    };
  }, [xAxis, yAxis, data]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: xAxis && yAxis ? `${yAxis} vs ${xAxis} 散布図` : '散布図',
      },
    },
    scales: {
      x: {
        title: { display: true, text: xAxis || 'X軸' },
      },
      y: {
        title: { display: true, text: yAxis || 'Y軸' },
      },
    },
  };

  if (numericColumns.length < 2) {
    return (
      <div className="chart-message">
        <p>散布図を表示するには、少なくとも2つの数値列が必要です。</p>
        <p>利用可能な数値列: {numericColumns.length}個</p>
      </div>
    );
  }

  return (
    <div className="chart-component">
      <div className="chart-layout">
        <div className="chart-controls-left">
          <CustomSelect
            label="X軸:"
            id="scatter-x-axis"
            value={xAxis}
            onChange={setXAxis}
            options={[
              { value: '', label: '選択してください' },
              ...numericColumns.map(column => ({ value: column, label: column }))
            ]}
            placeholder="X軸を選択"
          />

          <CustomSelect
            label="Y軸:"
            id="scatter-y-axis"
            value={yAxis}
            onChange={setYAxis}
            options={[
              { value: '', label: '選択してください' },
              ...numericColumns.map(column => ({ value: column, label: column }))
            ]}
            placeholder="Y軸を選択"
          />
        </div>

        <div className="chart-container">
          {xAxis && yAxis ? (
            <Scatter data={chartData} options={options} />
          ) : (
            <div className="chart-placeholder">
              <p>X軸とY軸を選択してください。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ScatterChart;
