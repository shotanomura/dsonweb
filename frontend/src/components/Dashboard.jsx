import React, { useState, useEffect } from 'react';
import Header from '../Header';
import DataTable from '../DataTable';
import DataSummary from '../DataSummary';
import DataVisualize from '../DataVisualize';
import MachineLearning from '../MachineLearning';
import CsvUploader from '../CsvUploader';
import '../App.css';
import { useAuth } from '../context/AuthContext';
import Papa from 'papaparse';
import HistoryPopup from './HistoryPopup';

function Dashboard() {
  const { token } = useAuth();
  const [filename, setFilename] = useState('');
  const [currentS3Key, setCurrentS3Key] = useState(null);
  const [columns, setColumns] = useState([]);
  const [data, setData] = useState([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('data');
  const [fileList, setFileList] = useState([]);
  const [loadingFile, setLoadingFile] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

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
                setCurrentS3Key(s3Key);
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

  const handleDataParsed = (parsedData, filename, metadata = {}) => {
    setError('');
    setColumns(Object.keys(parsedData[0]));
    setData(parsedData);
    setFilename(filename);
    if (metadata && metadata.s3_key) {
        setCurrentS3Key(metadata.s3_key);
    } else {
        setCurrentS3Key(null);
    }
    fetchFileList(); // リスト更新
  };

  const handleError = (errorMessage) => {
    setData([]);
    setColumns([]);
    setError(errorMessage);
  };

  const handleDeleteFile = async (uploadId) => {
      try {
          const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
          const res = await fetch(`${API_BASE_URL}/files/${uploadId}`, {
             method: 'DELETE',
             headers: {
                 'Authorization': `Bearer ${token}`
             }
          });

          if(res.ok) {
              // 成功したらリスト更新
              fetchFileList();
              // もし表示中のファイルだったらクリアする？ 
              // 複雑になるので今回はそのままでもいいが、ファイルが消えたことは認識させる
          } else {
              const err = await res.json();
              alert(`削除に失敗しました: ${err.detail || err.error}`);
          }
      } catch(e) {
          console.error("Delete failed", e);
          alert("削除処理中にエラーが発生しました");
      }
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
        onUploadComplete={fetchFileList}
        onToggleHistory={() => setIsHistoryOpen(true)}
      />
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          <main className="main-content" style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            {data.length > 0 ? (
              <div className="tab-content">
                {activeTab === 'data' && (
                  <DataTable columns={columns} data={data} />
                )}
                {activeTab === 'summary' && (
                  <DataSummary columns={columns} data={data} s3Key={currentS3Key} />
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
              <div className="empty-state" style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%',
                color: '#868e96'
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📂</div>
                <h2>データが読み込まれていません</h2>
                <p>右上の「ファイルを開く」ボタンから履歴を選択するか、<br/>以下から新しいファイルをアップロードしてください。</p>
                <div style={{ marginTop: '2rem' }}>
                    <CsvUploader
                        onDataParsed={handleDataParsed}
                        onError={handleError}
                        onUploadComplete={fetchFileList}
                    >
                        ファイルを選択またはドロップ
                    </CsvUploader>
                </div>
              </div>
            )}
          </main>
      </div>

      <HistoryPopup
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        fileList={fileList}
        onSelectFile={handleLoadRemoteFile}
        onDataParsed={handleDataParsed}
        onError={handleError}
        onUploadComplete={fetchFileList}
        onDeleteFile={handleDeleteFile}
      />
    </div>
  );
}

export default Dashboard;
