// src/App.jsx
import React, { useState } from 'react';
import Header from './Header'; // Headerコンポーネントをインポート
import DataTable from './DataTable';   // 子コンポーネントをインポート
import DataSummary from './DataSummary'; // 子コンポーネントをインポート
import DataVisualize from './DataVisualize'; // 子コンポーネントをインポート
import './App.css';

function App() {
  const [filename, setFilename] = useState('');
  const [columns, setColumns] = useState([]);
  const [data, setData] = useState([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('data'); // アクティブなタブを管理

  // 各グラフの選択状態を管理
  const [chartStates, setChartStates] = useState({
    scatter: {
      xAxis: '',
      yAxis: ''
    },
    stacked: {
      categoryColumn: '',
      stackColumn: ''
    },
    category: {
      categoryColumn: '',
      numericColumn: '',
      aggregationType: 'average'
    }
  });

  // CsvUploaderからデータを受け取るためのコールバック関数
  const handleDataParsed = (parsedData, filename) => {
    setError(''); // 正常に処理されたらエラーをクリア
    setColumns(Object.keys(parsedData[0]));
    setData(parsedData);
    setFilename(filename); // ファイル名を設定
  };

  // CsvUploaderからエラーを受け取るためのコールバック関数
  const handleError = (errorMessage) => {
    setData([]);
    setColumns([]);
    setError(errorMessage);
  };

  // タブ変更のハンドラー
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // 各グラフの状態を更新するためのヘルパー関数
  const updateChartState = (chartType, field, value) => {
    setChartStates(prev => ({
      ...prev,
      [chartType]: {
        ...prev[chartType],
        [field]: value
      }
    }));
  };

  return (
    <div className="App">
      <Header
        data={data}
        filename={filename}
        error={error}
        activeTab={activeTab}
        onDataParsed={handleDataParsed}
        onError={handleError}
        onTabChange={handleTabChange}
      />
      
      <main className="main-content">
        {data.length > 0 && (
          <div className="tab-content">
            {activeTab === 'data' && (
              <DataTable columns={columns} data={data} />
            )}
            {activeTab === 'summary' && (
              <DataSummary columns={columns} data={data} />
            )}
            {activeTab === 'graph' && (
              <DataVisualize 
                columns={columns} 
                data={data} 
                chartStates={chartStates}
                updateChartState={updateChartState}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;