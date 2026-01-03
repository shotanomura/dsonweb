import React, { useState } from 'react';
import Header from '../Header';
import DataTable from '../DataTable';
import DataSummary from '../DataSummary';
import DataVisualize from '../DataVisualize';
import MachineLearning from '../MachineLearning';
import WelcomeScreen from './WelcomeScreen';
import '../App.css';

function Dashboard() {
  const [filename, setFilename] = useState('');
  const [columns, setColumns] = useState([]);
  const [data, setData] = useState([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('data');

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

  const handleDataParsed = (parsedData, filename) => {
    setError('');
    setColumns(Object.keys(parsedData[0]));
    setData(parsedData);
    setFilename(filename);
  };

  const handleError = (errorMessage) => {
    setData([]);
    setColumns([]);
    setError(errorMessage);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

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
        {data.length > 0 ? (
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
            {activeTab === 'ml' && (
              <MachineLearning columns={columns} data={data} />
            )}
          </div>
        ) : (
          <WelcomeScreen 
            onDataParsed={handleDataParsed} 
            onError={handleError} 
          />
        )}
      </main>
    </div>
  );
}

export default Dashboard;
