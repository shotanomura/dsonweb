import React, { useState, useEffect } from 'react';
import Header from '../Header';
import DataTable from '../DataTable';
import DataSummary from '../DataSummary';
import DataVisualize from '../DataVisualize';
import MachineLearning from '../MachineLearning';
import WelcomeScreen from './WelcomeScreen';
import '../App.css';
import { useAuth } from '../context/AuthContext';
import Papa from 'papaparse';

function Dashboard() {
  const { token } = useAuth();
  const [filename, setFilename] = useState('');
  const [columns, setColumns] = useState([]);
  const [data, setData] = useState([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('data');
  const [fileList, setFileList] = useState([]);
  const [loadingFile, setLoadingFile] = useState(false);

  // --- ファイル一覧取得 ---
  const fetchFileList = async () => {
      try {
          const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
          const res = await fetch(`${API_BASE_URL}/files`, {
              headers: {
                  'Authorization': `Bearer ${token}`
              }
          });
          if (res.ok) {
              const list = await res.json();
              // 日付順にソート（新しい順）
              list.sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date));
              setFileList(list);
          }
      } catch (e) {
          console.error("Failed to fetch file list", e);
      }
  };

  useEffect(() => {
      if (token) {
          fetchFileList();
      }
  }, [token]);

  // --- S3からファイルをロード ---
  const handleLoadRemoteFile = async (s3Key, originalFilename) => {
      setLoadingFile(true);
      setError('');
      try {
          const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
          const res = await fetch(`${API_BASE_URL}/download?s3_key=${encodeURIComponent(s3Key)}`, {
              headers: {
                  'Authorization': `Bearer ${token}`
              }
          });
          
          if (!res.ok) throw new Error("Failed to download file");
          
          const result = await res.json();
          const csvContent = result.content;
          
          // CSVパース
          Papa.parse(csvContent, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
              if (results.data.length > 0) {
                setColumns(Object.keys(results.data[0]));
                setData(results.data);
                setFilename(originalFilename);
                setActiveTab('data'); // データタブに切り替え
              } else {
                setError('CSVファイルが空か、内容を読み取れませんでした。');
              }
              setLoadingFile(false);
            },
            error: (err) => {
              setError(`ファイルの解析に失敗しました: ${err.message}`);
              setLoadingFile(false);
            },
          });

      } catch (e) {
          setError(`ファイルのロードに失敗しました: ${e.message}`);
          setLoadingFile(false);
      }
  };

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
    fetchFileList(); // リスト更新
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
    <div className="App" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden'}}>
      <Header
        data={data}
        filename={filename}
        error={error}
        activeTab={activeTab}
        onDataParsed={handleDataParsed}
        onError={handleError}
        onTabChange={handleTabChange}
      />
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* サイドバー: ファイル履歴 (データがある場合のみ、または常に表示？ 今回は常に表示してみる) */}
          <aside style={{
              width: '250px',
              backgroundColor: '#f8f9fa', 
              borderRight: '1px solid #dee2e6',
              padding: '1rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column'
          }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#495057' }}>📁 アップロード履歴</h3>
              {loadingFile && <div style={{fontSize:'0.8rem', color:'#666'}}>Wait... Loading...</div>}
              
              {fileList.length === 0 && <p style={{fontSize:'0.8rem', color:'#999'}}>履歴はありません</p>}
              
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {fileList.map((file) => (
                      <li key={file.upload_id} 
                          onClick={() => handleLoadRemoteFile(file.s3_key, file.filename)}
                          style={{
                              padding: '0.75rem',
                              marginBottom: '0.5rem',
                              backgroundColor: '#fff',
                              border: '1px solid #e9ecef',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.9rem',
                              transition: 'all 0.2s',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.borderColor = '#007bff'}
                          onMouseOut={(e) => e.currentTarget.style.borderColor = '#e9ecef'}
                      >
                          <div style={{ fontWeight: 'bold', marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {file.filename}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#868e96' }}>
                              {new Date(file.upload_date).toLocaleString('ja-JP')}
                          </div>
                      </li>
                  ))}
              </ul>
          </aside>

          <main className="main-content" style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
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
    </div>
  );
}

export default Dashboard;
