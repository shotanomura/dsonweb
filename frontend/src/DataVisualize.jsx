import React, { useState } from 'react';
import ScatterChart from './charts/ScatterChart';
import StackedBarChart from './charts/StackedBarChart';
import CategoryNumericChart from './charts/CategoryNumericChart';

function DataVisualize({ columns, data, chartStates, updateChartState }) {
  const [activeChartTab, setActiveChartTab] = useState('scatter');

  const chartTabs = [
    { id: 'scatter', label: '散布図', component: ScatterChart },
    { id: 'stacked', label: '積み上げ棒グラフ', component: StackedBarChart },
    { id: 'category', label: 'カテゴリ別分析', component: CategoryNumericChart },
  ];

  const renderActiveChart = () => {
    const activeTab = chartTabs.find(tab => tab.id === activeChartTab);
    if (!activeTab) return null;

    const ChartComponent = activeTab.component;
    return (
      <ChartComponent 
        columns={columns} 
        data={data} 
        chartState={chartStates[activeChartTab]}
        updateChartState={(field, value) => updateChartState(activeChartTab, field, value)}
      />
    );
  };

  return (
    <div className="data-visualize">
      <div className="chart-tabs">
        {chartTabs.map(tab => (
          <button
            key={tab.id}
            className={`chart-tab-button ${activeChartTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveChartTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="chart-tab-content">
        {renderActiveChart()}
      </div>
    </div>
  );
}

export default DataVisualize;