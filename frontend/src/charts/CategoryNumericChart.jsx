import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import CustomSelect from '../components/CustomSelect';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function CategoryNumericChart({ columns, data, chartState, updateChartState }) {
  const categoryColumn = chartState?.categoryColumn || '';
  const numericColumn = chartState?.numericColumn || '';
  const aggregationType = chartState?.aggregationType || 'average';

  const setCategoryColumn = (value) => updateChartState('categoryColumn', value);
  const setNumericColumn = (value) => updateChartState('numericColumn', value);
  const setAggregationType = (value) => updateChartState('aggregationType', value);

  // カテゴリデータの列を抽出
  const categoryColumns = useMemo(() => {
    if (data.length === 0) return [];

    return columns.filter(column => {
      const uniqueValues = [...new Set(data.map(row => row[column]))];
      return uniqueValues.length <= 20 && uniqueValues.length >= 2;
    });
  }, [columns, data]);

  // 数値データの列を抽出
  const numericColumns = useMemo(() => {
    if (data.length === 0) return [];

    return columns.filter(column => {
      return data.every(row => {
        const value = row[column];
        return value === '' || value === null || !isNaN(Number(value));
      });
    });
  }, [columns, data]);

  // カテゴリ別の数値データの集計
  const chartData = useMemo(() => {
    if (!categoryColumn || !numericColumn || data.length === 0) {
      return { labels: [], datasets: [] };
    }

    // カテゴリ別にデータをグループ化
    const groups = {};
    data.forEach(row => {
      const category = row[categoryColumn];
      const value = Number(row[numericColumn]);

      if (!isNaN(value)) {
        if (!groups[category]) groups[category] = [];
        groups[category].push(value);
      }
    });

    const categories = Object.keys(groups);
    let aggregatedData;
    let yAxisLabel;

    // 集計方法に応じて計算
    switch (aggregationType) {
      case 'average':
        aggregatedData = categories.map(cat =>
          groups[cat].reduce((sum, val) => sum + val, 0) / groups[cat].length
        );
        yAxisLabel = `平均${numericColumn}`;
        break;
      case 'sum':
        aggregatedData = categories.map(cat =>
          groups[cat].reduce((sum, val) => sum + val, 0)
        );
        yAxisLabel = `合計${numericColumn}`;
        break;
      case 'count':
        aggregatedData = categories.map(cat => groups[cat].length);
        yAxisLabel = 'データ件数';
        break;
      case 'max':
        aggregatedData = categories.map(cat => Math.max(...groups[cat]));
        yAxisLabel = `最大${numericColumn}`;
        break;
      case 'min':
        aggregatedData = categories.map(cat => Math.min(...groups[cat]));
        yAxisLabel = `最小${numericColumn}`;
        break;
      default:
        aggregatedData = categories.map(cat =>
          groups[cat].reduce((sum, val) => sum + val, 0) / groups[cat].length
        );
        yAxisLabel = `平均${numericColumn}`;
    }

    return {
      labels: categories,
      datasets: [{
        label: yAxisLabel,
        data: aggregatedData,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 2,
      }]
    };
  }, [categoryColumn, numericColumn, aggregationType, data]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: categoryColumn && numericColumn ?
          `${categoryColumn}別の${numericColumn}${getAggregationText()}` :
          'カテゴリ別数値分析',
      },
    },
    scales: {
      x: {
        title: { display: true, text: categoryColumn || 'カテゴリ' },
      },
      y: {
        title: { display: true, text: getYAxisLabel() },
        beginAtZero: aggregationType !== 'min',
      },
    },
  };

  function getAggregationText() {
    switch (aggregationType) {
      case 'average': return '（平均値）';
      case 'sum': return '（合計値）';
      case 'count': return '（件数）';
      case 'max': return '（最大値）';
      case 'min': return '（最小値）';
      default: return '';
    }
  }

  function getYAxisLabel() {
    if (!numericColumn) return '値';
    switch (aggregationType) {
      case 'average': return `平均${numericColumn}`;
      case 'sum': return `合計${numericColumn}`;
      case 'count': return 'データ件数';
      case 'max': return `最大${numericColumn}`;
      case 'min': return `最小${numericColumn}`;
      default: return numericColumn;
    }
  }

  if (categoryColumns.length < 1 || numericColumns.length < 1) {
    return (
      <div className="chart-message">
        <p>カテゴリ別分析を表示するには、カテゴリ列と数値列が必要です。</p>
        <p>利用可能なカテゴリ列: {categoryColumns.length}個</p>
        <p>利用可能な数値列: {numericColumns.length}個</p>
      </div>
    );
  }

  return (
    <div className="chart-component">
      <div className="chart-layout">
        <div className="chart-controls-left">
          <CustomSelect
            label="カテゴリ列:"
            id="category-col"
            value={categoryColumn}
            onChange={setCategoryColumn}
            options={[
              { value: '', label: '選択してください' },
              ...categoryColumns.map(column => ({ value: column, label: column }))
            ]}
            placeholder="カテゴリ列を選択"
          />

          <CustomSelect
            label="数値列:"
            id="numeric-col"
            value={numericColumn}
            onChange={setNumericColumn}
            options={[
              { value: '', label: '選択してください' },
              ...numericColumns.map(column => ({ value: column, label: column }))
            ]}
            placeholder="数値列を選択"
          />

          <CustomSelect
            label="集計方法:"
            id="aggregation-type"
            value={aggregationType}
            onChange={setAggregationType}
            options={[
              { value: 'average', label: '平均値' },
              { value: 'sum', label: '合計値' },
              { value: 'count', label: '件数' },
              { value: 'max', label: '最大値' },
              { value: 'min', label: '最小値' }
            ]}
            placeholder="集計方法を選択"
          />
        </div>

        <div className="chart-container">
          {categoryColumn && numericColumn ? (
            <Bar data={chartData} options={options} />
          ) : (
            <div className="chart-placeholder">
              <p>カテゴリ列と数値列を選択してください。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CategoryNumericChart;
