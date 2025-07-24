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

function StackedBarChart({ columns, data, chartState, updateChartState }) {
  const categoryColumn = chartState?.categoryColumn || '';
  const stackColumn = chartState?.stackColumn || '';

  const setCategoryColumn = (value) => updateChartState('categoryColumn', value);
  const setStackColumn = (value) => updateChartState('stackColumn', value);

  // カテゴリデータの列を抽出
  const categoryColumns = useMemo(() => {
    if (data.length === 0) return [];
    
    return columns.filter(column => {
      const uniqueValues = [...new Set(data.map(row => row[column]))];
      return uniqueValues.length <= 20 && uniqueValues.length >= 2; // 2〜20のユニーク値
    });
  }, [columns, data]);

  // 積み上げ棒グラフのデータを生成
  const chartData = useMemo(() => {
    if (!categoryColumn || !stackColumn || data.length === 0) {
      return { labels: [], datasets: [] };
    }

    // カテゴリとスタック項目の組み合わせを集計
    const counts = {};
    const stackItems = new Set();
    
    data.forEach(row => {
      const category = row[categoryColumn];
      const stack = row[stackColumn];
      
      if (!counts[category]) counts[category] = {};
      if (!counts[category][stack]) counts[category][stack] = 0;
      counts[category][stack]++;
      stackItems.add(stack);
    });

    const categories = Object.keys(counts);
    const stackArray = Array.from(stackItems);
    
    // カラーパレット
    const colors = [
      'rgba(255, 99, 132, 0.8)',
      'rgba(54, 162, 235, 0.8)',
      'rgba(255, 205, 86, 0.8)',
      'rgba(75, 192, 192, 0.8)',
      'rgba(153, 102, 255, 0.8)',
      'rgba(255, 159, 64, 0.8)',
      'rgba(199, 199, 199, 0.8)',
      'rgba(83, 102, 255, 0.8)',
    ];

    const datasets = stackArray.map((stack, index) => ({
      label: stack,
      data: categories.map(category => counts[category][stack] || 0),
      backgroundColor: colors[index % colors.length],
      borderColor: colors[index % colors.length].replace('0.8', '1'),
      borderWidth: 1,
    }));

    return {
      labels: categories,
      datasets
    };
  }, [categoryColumn, stackColumn, data]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: categoryColumn && stackColumn ? 
          `${categoryColumn}別の${stackColumn}分布（積み上げ棒グラフ）` : 
          '積み上げ棒グラフ',
      },
    },
    scales: {
      x: {
        title: { display: true, text: categoryColumn || 'カテゴリ' },
        stacked: true,
      },
      y: {
        title: { display: true, text: '件数' },
        stacked: true,
        beginAtZero: true,
      },
    },
  };

  if (categoryColumns.length < 2) {
    return (
      <div className="chart-message">
        <p>積み上げ棒グラフを表示するには、少なくとも2つのカテゴリ列が必要です。</p>
        <p>利用可能なカテゴリ列: {categoryColumns.length}個</p>
      </div>
    );
  }

  return (
    <div className="chart-component">
      <div className="chart-layout">
        <div className="chart-controls-left">
          <CustomSelect
            label="カテゴリ列:"
            id="category-column"
            value={categoryColumn}
            onChange={setCategoryColumn}
            options={[
              { value: '', label: '選択してください' },
              ...categoryColumns.map(column => ({ value: column, label: column }))
            ]}
            placeholder="カテゴリ列を選択"
          />

          <CustomSelect
            label="積み上げ項目:"
            id="stack-column"
            value={stackColumn}
            onChange={setStackColumn}
            options={[
              { value: '', label: '選択してください' },
              ...categoryColumns
                .filter(col => col !== categoryColumn)
                .map(column => ({ value: column, label: column }))
            ]}
            placeholder="積み上げ項目を選択"
          />
        </div>

        <div className="chart-container">
          {categoryColumn && stackColumn ? (
            <Bar data={chartData} options={options} />
          ) : (
            <div className="chart-placeholder">
              <p>カテゴリ列と積み上げ項目を選択してください。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StackedBarChart;
