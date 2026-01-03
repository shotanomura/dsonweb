import React, { useState, useMemo, useEffect, useRef } from 'react';
import CustomSelect from './components/CustomSelect';

// 環境変数から設定を読み込み
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function MachineLearning({ columns, data }) {
  const [targetColumn, setTargetColumn] = useState('');
  const [featureColumns, setFeatureColumns] = useState([]);
  const [problemType, setProblemType] = useState('regression'); // 'regression' or 'classification'
  const [trainTestSplit, setTrainTestSplit] = useState(0.8);
  const [isConnected, setIsConnected] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [testData, setTestData] = useState(null);
  const [testFilename, setTestFilename] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [isModelTrained, setIsModelTrained] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const websocketRef = useRef(null);
  const logsEndRef = useRef(null);
  const logsContainerRef = useRef(null);

  if (!data || data.length === 0) {
    return <div>データがありません</div>;
  }

  // ログを追加する関数
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { 
      id: Date.now(), 
      timestamp, 
      message, 
      type 
    }]);
  };

  // ログを最下部にスクロール（ログコンテナ内でのみ）
  const scrollToBottom = () => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  // 数値列を特定する関数
  const getNumericColumns = () => {
    return columns.filter(column => {
      return data.every(row => {
        const value = row[column];
        return value === '' || value === null || !isNaN(Number(value));
      });
    });
  };

  // カテゴリ列を特定する関数
  const getCategoricalColumns = () => {
    return columns.filter(column => {
      const uniqueValues = [...new Set(data.map(row => row[column]))];
      return uniqueValues.length <= 50 && uniqueValues.length >= 2;
    });
  };

  const numericColumns = getNumericColumns();
  const categoricalColumns = getCategoricalColumns();

  // 問題タイプに応じた目的変数の候補
  const targetCandidates = useMemo(() => {
    if (problemType === 'regression') {
      return numericColumns;
    } else {
      return categoricalColumns;
    }
  }, [problemType, numericColumns, categoricalColumns]);

  // 特徴量の候補（目的変数を除く）
  const featureCandidates = useMemo(() => {
    return columns.filter(col => col !== targetColumn);
  }, [columns, targetColumn]);

  // 目的変数が変更された時に特徴量を自動選択
  useEffect(() => {
    if (targetColumn && featureCandidates.length > 0) {
      setFeatureColumns(featureCandidates);
    }
  }, [targetColumn, featureCandidates]);

  // WebSocket接続の管理
  const connectWebSocket = () => {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(`${WS_BASE_URL}/ws/train`);
        websocketRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          setError('');
          addLog('バックエンドサーバーに接続しました', 'success');
          resolve(ws);
        };

        ws.onmessage = (event) => {
          addLog(`サーバーからの応答: ${event.data}`, 'info');
          // 機械学習完了のメッセージをチェック
          if (event.data.includes('機械学習パイプライン完了')) {
            setIsModelTrained(true);
          }
        };

        ws.onerror = (error) => {
          addLog(`WebSocket エラー: ${error}`, 'error');
          setError('WebSocket接続でエラーが発生しました');
          reject(error);
        };

        ws.onclose = () => {
          setIsConnected(false);
          addLog('サーバーとの接続が切断されました', 'warning');
          websocketRef.current = null;
        };

      } catch (err) {
        setError('WebSocket接続に失敗しました');
        addLog(`接続エラー: ${err.message}`, 'error');
        reject(err);
      }
    });
  };

  // コンポーネントのクリーンアップ
  useEffect(() => {
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []);

  // 学習パラメータとデータを送信
  const sendTrainingParamsAndData = async () => {
    if (!targetColumn || featureColumns.length === 0) {
      setError('目的変数と特徴量を選択してください');
      addLog('エラー: 目的変数と特徴量を選択してください', 'error');
      return;
    }

    setIsTraining(true);
    setError('');

    try {
      // まずCSVファイルをアップロード
      addLog('CSVファイルをサーバーにアップロード中...', 'info');
      
      // CSVデータをBlobに変換
      const csvContent = convertDataToCSV(data, columns);
      const csvFile = new File([csvContent], 'data.csv', { type: 'text/csv' });
      
      const formData = new FormData();
      formData.append('file', csvFile);
      
      const uploadResponse = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      
      const uploadResult = await uploadResponse.json();
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'ファイルアップロードに失敗しました');
      }
      
      addLog('CSVファイルのアップロードが完了しました', 'success');
      addLog(`アップロードファイル: ${uploadResult.data_info.filename}`, 'info');
      addLog(`データサイズ: ${uploadResult.data_info.shape[0]}行 × ${uploadResult.data_info.shape[1]}列`, 'info');

      // WebSocketが接続されていない場合、自動で接続
      if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
        addLog('サーバーに接続中...', 'info');
        await connectWebSocket();
      }

      const params = {
        targetColumn,
        featureColumns,
        problemType,
        trainTestSplit,
        dataSize: data.length,
        timestamp: new Date().toISOString()
      };

      addLog(`学習パラメータを送信中...`, 'info');
      addLog(`目的変数: ${targetColumn}`, 'info');
      addLog(`特徴量: ${featureColumns.join(', ')}`, 'info');
      addLog(`問題タイプ: ${problemType === 'regression' ? '回帰' : '分類'}`, 'info');
      addLog(`訓練データ比率: ${(trainTestSplit * 100).toFixed(0)}%`, 'info');

      websocketRef.current.send(JSON.stringify(params));

      addLog('学習パラメータを送信しました', 'success');
      addLog('機械学習の準備が完了しました', 'success');

      // 学習状態を一定時間後にリセット
      setTimeout(() => {
        setIsTraining(false);
        setIsModelTrained(true);
      }, 3000);

    } catch (error) {
      setIsTraining(false);
      setError('接続またはデータ送信に失敗しました');
      addLog(`エラー: ${error.message}`, 'error');
    }
  };

  // テストデータのCSVファイルを読み込む関数
  const handleTestFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split('\n').filter(line => line.trim());
        if (lines.length < 2) throw new Error('CSVファイルにデータがありません。');
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });
        
        setTestData(data);
        setTestFilename(file.name);
        setPredictions([]);
        addLog(`テストデータを読み込みました: ${file.name} (${data.length}件)`, 'success');
        
      } catch (error) {
        addLog(`テストデータ読み込みエラー: ${error.message}`, 'error');
      }
    };
    reader.readAsText(file);
    // ファイル選択をクリア
    event.target.value = '';
  };

  // 推論を実行してCSVダウンロードする関数
  const runPredictions = async () => {
    if (!testData || !isModelTrained) {
      addLog('エラー: テストデータまたは学習済みモデルがありません', 'error');
      return;
    }

    try {
      addLog('推論を開始します...', 'info');
      
      // バッチ推論APIを呼び出し
      const response = await fetch(`${API_BASE_URL}/predict_batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: testData }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // CSV形式で結果を整形
        const csvHeaders = ['行番号', ...featureColumns, '予測値'];
        const csvRows = testData.map((row, index) => {
          const featureValues = featureColumns.map(col => row[col] || '');
          return [index + 1, ...featureValues, result.predictions[index]];
        });
        
        // CSVコンテンツを作成
        const csvContent = [
          csvHeaders.join(','),
          ...csvRows.map(row => row.join(','))
        ].join('\n');
        
        // CSVファイルをダウンロード
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `predictions_${new Date().getTime()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        addLog(`推論完了: ${result.count}件の予測結果をCSVファイルでダウンロードしました`, 'success');
        
      } else {
        addLog(`推論エラー: ${result.error}`, 'error');
      }
      
    } catch (error) {
      addLog(`推論エラー: ${error.message}`, 'error');
    }
  };

  // データをCSV形式に変換する関数
  const convertDataToCSV = (data, columns) => {
    const header = columns.join(',');
    const rows = data.map(row => 
      columns.map(col => {
        const value = row[col];
        // 値にカンマや改行が含まれている場合はダブルクォートで囲む
        if (typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );
    return [header, ...rows].join('\n');
  };

  // ログをクリア
  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="machine-learning">
      <div className="ml-layout">
        <div className="ml-controls-left">
          <div className="ml-settings-container">
            <h3 className="section-title">機械学習設定</h3>
            
            <div className="select-row">
              <CustomSelect
                label="問題タイプ:"
                id="problem-type"
                value={problemType}
                onChange={setProblemType}
                options={[
                  { value: 'regression', label: '回帰' },
                  { value: 'classification', label: '分類' }
                ]}
                placeholder="問題タイプを選択"
              />

              <CustomSelect
                label="目的変数:"
                id="target-column"
                value={targetColumn}
                onChange={setTargetColumn}
                options={[
                  { value: '', label: '選択してください' },
                  ...targetCandidates.map(column => ({ value: column, label: column }))
                ]}
                placeholder="目的変数を選択"
              />
            </div>

            <div className="feature-selection-compact">
              <label className="feature-label">特徴量（複数選択可）:</label>
              <div className="feature-list-compact">
                {featureCandidates.map(column => (
                  <div key={column} className="feature-item-compact">
                    <input
                      type="checkbox"
                      id={`feature-${column}`}
                      checked={featureColumns.includes(column)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFeatureColumns(prev => [...prev, column]);
                        } else {
                          setFeatureColumns(prev => prev.filter(col => col !== column));
                        }
                      }}
                    />
                    <label htmlFor={`feature-${column}`} className="feature-item-label">
                      {column} 
                      <span className="column-type-compact">
                        ({numericColumns.includes(column) ? '数値' : 'カテゴリ'})
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="advanced-settings-button-container">
              <button 
                className="advanced-settings-button"
                onClick={() => setShowAdvancedSettings(true)}
              >
                詳細設定
              </button>
            </div>
          </div>
        </div>

        <div className="ml-results-right">
          {/* 上部: 機械学習操作セクション */}
          <div className="upper-right">
            <div className="ml-actions-container">
              <h3 className="section-title">機械学習操作</h3>
              
              <div className="action-buttons-horizontal">
                <div className="action-button-group">
                  <h4>1. 訓練実行</h4>
                  <button 
                    className="train-button-small"
                    onClick={sendTrainingParamsAndData}
                    disabled={isTraining || !targetColumn || featureColumns.length === 0}
                  >
                    {isTraining ? '送信中...' : '訓練開始'}
                  </button>
                </div>

                <div className="action-button-group-wide">
                  <h4>2. 推論データ選択・出力</h4>
                  <div className="button-row">
                    <label className="test-file-button-inline">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleTestFileUpload}
                        style={{ display: 'none' }}
                      />
                      データ選択
                    </label>
                    {testData && isModelTrained ? (
                      <button 
                        className="predict-button-inline"
                        onClick={runPredictions}
                      >
                        CSV出力 ({testData.length}件)
                      </button>
                    ) : (
                      <button 
                        className="predict-button-inline disabled"
                        disabled
                      >
                        {!testData ? 'データ未選択' : 'モデル未学習'}
                      </button>
                    )}
                  </div>
                  {testFilename && (
                    <p className="filename-display">
                      選択済み: {testFilename.length > 20 ? testFilename.substring(0, 20) + '...' : testFilename}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 下部: ログセクション */}
          <div className="lower-right">
            <div className="logs-container">
              <div className="logs-header">
                <h3 className="section-title">通信ログ</h3>
                <div className="header-controls">
                  <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
                    {isConnected ? '🟢 接続中' : '🔴 未接続'}
                  </div>
                  <button className="clear-logs-button" onClick={clearLogs}>
                    ログクリア
                  </button>
                </div>
              </div>

              {error && (
                <div className="error-message">
                  <h4>エラー</h4>
                  <p>{error}</p>
                </div>
              )}

              <div className="logs-container-compact" ref={logsContainerRef}>
                {logs.length === 0 ? (
                  <div className="logs-placeholder">
                    <p>上記の操作ボタンを使用すると、サーバーとの通信ログがここに表示されます。</p>
                  </div>
                ) : (
                  <div className="logs-list">
                    {logs.map((log) => (
                      <div key={log.id} className={`log-entry log-${log.type}`}>
                        <span className="log-timestamp">[{log.timestamp}]</span>
                        <span className="log-message">{log.message}</span>
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 詳細設定モーダル */}
      {showAdvancedSettings && (
        <div className="modal-overlay" onClick={() => setShowAdvancedSettings(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>詳細設定</h3>
              <button 
                className="modal-close-button"
                onClick={() => setShowAdvancedSettings(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="advanced-setting-item">
                <label htmlFor="modal-split-ratio" className="advanced-setting-label">
                  訓練データ比率: {(trainTestSplit * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  id="modal-split-ratio"
                  min="0.5"
                  max="0.9"
                  step="0.05"
                  value={trainTestSplit}
                  onChange={(e) => setTrainTestSplit(parseFloat(e.target.value))}
                  className="advanced-setting-range"
                />
                <div className="range-labels">
                  <span>50%</span>
                  <span>90%</span>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="modal-apply-button"
                onClick={() => setShowAdvancedSettings(false)}
              >
                適用
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MachineLearning;
