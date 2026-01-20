import React, { useState, useMemo } from 'react';
import CustomSelect from './components/CustomSelect';
import './App.css'; 
import { useAuth } from './context/AuthContext';
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function DataSummary({ columns, data, s3Key }) {
  const { token } = useAuth();
  const [selectedColumn, setSelectedColumn] = useState('');
  const [correlationType, setCorrelationType] = useState('correlation'); 
  const [controlColumns, setControlColumns] = useState([]);
  const [activeTab, setActiveTab] = useState('numeric'); 

  // Time Series States
  const [tsTargetColumn, setTsTargetColumn] = useState('');
  const [tsResult, setTsResult] = useState(null);
  const [tsLoading, setTsLoading] = useState(false);
  const [tsError, setTsError] = useState('');

  if (!data || data.length === 0) {
    return <div>データがありません</div>;
  }

  // 数値列を特定
  const getNumericColumns = () => {
    return columns.filter(column => {
      return data.every(row => {
        const value = row[column];
        return value === '' || value === null || !isNaN(Number(value));
      });
    });
  };

  const numericColumns = getNumericColumns();
  const categoricalColumns = columns.filter(col => !numericColumns.includes(col));

  // --- Time Series Analysis Handler ---
  const handleTimeSeriesAnalyze = async () => {
      if (!tsTargetColumn) return;
      if (!s3Key) {
          setTsError("クラウドに保存されたファイルでのみ利用可能です。");
          return;
      }
      
      setTsLoading(true);
      setTsError('');
      setTsResult(null);

      try {
          const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
          const res = await fetch(`${API_BASE_URL}/analyze/time_series`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                  s3_key: s3Key,
                  target_column: tsTargetColumn,
                  lags: 40
              })
          });

          if (!res.ok) {
              const err = await res.json();
              throw new Error(err.detail || "Analysis failed");
          }

          const responseData = await res.json();
          if (responseData.success) {
              setTsResult(responseData.result);
          } else {
              throw new Error(responseData.error || "Unknown error");
          }
      } catch (e) {
          console.error("Time Series Analysis Error", e);
          setTsError(e.message);
      } finally {
          setTsLoading(false);
      }
  };

  // Chart Data Preparation
  const acfChartData = useMemo(() => {
      if (!tsResult || !tsResult.acf) return null;
      return {
          labels: tsResult.lags,
          datasets: [
              {
                  label: '自己相関係数 (ACF)',
                  data: tsResult.acf,
                  backgroundColor: 'rgba(53, 162, 235, 0.5)',
                  borderColor: 'rgba(53, 162, 235, 1)',
                  borderWidth: 1,
              },
              {
                  label: '偏自己相関係数 (PACF)',
                  data: tsResult.pacf,
                  backgroundColor: 'rgba(255, 99, 132, 0.5)',
                  borderColor: 'rgba(255, 99, 132, 1)',
                  borderWidth: 1,
              }
          ]
      };
  }, [tsResult]);

  // 相関係数ロジック (既存)
  const calculateCorrelation = (col1, col2) => {
    const validRows = data.filter(row => {
      const val1 = row[col1];
      const val2 = row[col2];
      return val1 !== null && val1 !== '' && val1 !== undefined &&
        val2 !== null && val2 !== '' && val2 !== undefined &&
        !isNaN(Number(val1)) && !isNaN(Number(val2));
    });

    if (validRows.length < 2) return null;

    const values1 = validRows.map(row => Number(row[col1]));
    const values2 = validRows.map(row => Number(row[col2]));

    const mean1 = values1.reduce((acc, val) => acc + val, 0) / values1.length;
    const mean2 = values2.reduce((acc, val) => acc + val, 0) / values2.length;

    let numerator = 0;
    let denominator1 = 0;
    let denominator2 = 0;

    for (let i = 0; i < values1.length; i++) {
      const diff1 = values1[i] - mean1;
      const diff2 = values2[i] - mean2;
      numerator += diff1 * diff2;
      denominator1 += diff1 * diff1;
      denominator2 += diff2 * diff2;
    }

    const denominator = Math.sqrt(denominator1 * denominator2);
    return denominator === 0 ? 0 : numerator / denominator;
  };

  const calculatePartialCorrelation = (col1, col2, controlCols) => {
    if (controlCols.length === 0) {
      return calculateCorrelation(col1, col2);
    }
    const validRows = data.filter(row => {
      const allCols = [col1, col2, ...controlCols];
      return allCols.every(col => {
        const val = row[col];
        return val !== null && val !== '' && val !== undefined && !isNaN(Number(val));
      });
    });

    if (validRows.length < controlCols.length + 3) return null;
    const matrix = validRows.map(row => [col1, col2, ...controlCols].map(col => Number(row[col])));
    const corrMatrix = calculateCorrelationMatrix(matrix);
    if (!corrMatrix || corrMatrix.length < 2) return null;

    try {
      const invMatrix = invertMatrix(corrMatrix);
      if (!invMatrix) return null;
      const r12_partial = -invMatrix[0][1] / Math.sqrt(invMatrix[0][0] * invMatrix[1][1]);
      return isNaN(r12_partial) ? null : r12_partial;
    } catch (error) {
      console.error('偏相関計算エラー:', error);
      return null;
    }
  };

  const calculateCorrelationMatrix = (matrix) => {
    const n = matrix.length;
    const p = matrix[0].length;
    const means = [];
    for (let j = 0; j < p; j++) {
      means[j] = matrix.reduce((sum, row) => sum + row[j], 0) / n;
    }
    const corrMatrix = Array(p).fill().map(() => Array(p).fill(0));
    for (let i = 0; i < p; i++) {
      for (let j = 0; j < p; j++) {
        if (i === j) {
          corrMatrix[i][j] = 1;
        } else {
          let numerator = 0;
          let denom1 = 0;
          let denom2 = 0;
          for (let k = 0; k < n; k++) {
            const diff1 = matrix[k][i] - means[i];
            const diff2 = matrix[k][j] - means[j];
            numerator += diff1 * diff2;
            denom1 += diff1 * diff1;
            denom2 += diff2 * diff2;
          }
          const denominator = Math.sqrt(denom1 * denom2);
          corrMatrix[i][j] = denominator === 0 ? 0 : numerator / denominator;
        }
      }
    }
    return corrMatrix;
  };

  const invertMatrix = (matrix) => {
    const n = matrix.length;
    const augmented = matrix.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]);
    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
      if (Math.abs(augmented[i][i]) < 1e-10) return null;
      const pivot = augmented[i][i];
      for (let j = 0; j < 2 * n; j++) {
        augmented[i][j] /= pivot;
      }
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = augmented[k][i];
          for (let j = 0; j < 2 * n; j++) {
            augmented[k][j] -= factor * augmented[i][j];
          }
        }
      }
    }
    return augmented.map(row => row.slice(n));
  };

  const correlationData = useMemo(() => {
    if (!selectedColumn || !numericColumns.includes(selectedColumn)) return [];
    try {
      return numericColumns
        .filter(col => col !== selectedColumn && !controlColumns.includes(col))
        .map(col => {
          const correlation = correlationType === 'partial'
            ? calculatePartialCorrelation(selectedColumn, col, controlColumns)
            : calculateCorrelation(selectedColumn, col);
          return {
            column: col,
            correlation: correlation
          };
        })
        .filter(item => item.correlation !== null && !isNaN(item.correlation))
        .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
    } catch (error) {
      console.error('相関係数計算エラー:', error);
      return [];
    }
  }, [selectedColumn, data, numericColumns, correlationType, controlColumns]);

  const calculateStats = (column) => {
    const values = data
      .map(row => Number(row[column]))
      .filter(value => !isNaN(value) && value !== null);

    if (values.length === 0) return null;

    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / values.length;
    const sortedValues = [...values].sort((a, b) => a - b);
    const median = sortedValues.length % 2 === 0
      ? (sortedValues[sortedValues.length / 2 - 1] + sortedValues[sortedValues.length / 2]) / 2
      : sortedValues[Math.floor(sortedValues.length / 2)];
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      count: values.length,
      mean: mean.toFixed(2),
      median: median.toFixed(2),
      min: min.toFixed(2),
      max: max.toFixed(2),
      sum: sum.toFixed(2)
    };
  };

  return (
    <div className="data-summary">
      <div className="sub-tabs-container">
        {numericColumns.length > 0 && (
          <button 
            className={`sub-tab-button ${activeTab === 'numeric' ? 'active' : ''}`}
            onClick={() => setActiveTab('numeric')}
          >
            数値列の統計
          </button>
        )}
        <button 
          className={`sub-tab-button ${activeTab === 'categorical' ? 'active' : ''}`}
          onClick={() => setActiveTab('categorical')}
        >
          カテゴリ列の情報
        </button>
        {numericColumns.length > 1 && (
          <button 
            className={`sub-tab-button ${activeTab === 'correlation' ? 'active' : ''}`}
            onClick={() => setActiveTab('correlation')}
          >
            相関係数分析
          </button>
        )}
        {numericColumns.length > 0 && (
            <button 
                className={`sub-tab-button ${activeTab === 'timeseries' ? 'active' : ''}`}
                onClick={() => setActiveTab('timeseries')}
            >
                時系列分析
            </button>
        )}
      </div>

      <div className="sub-tab-content">
        {activeTab === 'numeric' && numericColumns.length > 0 && (
          <div className="numeric-stats">
            <h3>数値列の統計</h3>
            <table className="stats-table">
              <thead>
                <tr>
                  <th>列名</th>
                  <th>欠損</th>
                  <th>平均</th>
                  <th>中央値</th>
                  <th>最小値</th>
                  <th>最大値</th>
                  <th>合計</th>
                </tr>
              </thead>
              <tbody>
                {numericColumns.map(column => {
                  const stats = calculateStats(column);
                  const EmptyCount = data.filter(row =>
                    row[column] == '' || row[column] == null || row[column] == undefined
                  ).length;
                  return stats ? (
                    <tr key={column}>
                      <td>{column}</td>
                      <td>{EmptyCount}</td>
                      <td>{stats.mean}</td>
                      <td>{stats.median}</td>
                      <td>{stats.min}</td>
                      <td>{stats.max}</td>
                      <td>{stats.sum}</td>
                    </tr>
                  ) : null;
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'categorical' && (
          <div className="column-info">
            <h3>カテゴリ列の情報</h3>
            <table className="column-table">
              <thead>
                <tr>
                  <th>列名</th>
                  <th>欠損</th>
                  <th>ユニーク値数</th>
                  <th>選択肢</th>
                </tr>
              </thead>
              <tbody>
                {categoricalColumns.map(column => {
                  const uniqueValues = new Set(data.map(row => row[column]));
                  const EmptyCount = data.filter(row =>
                    row[column] == '' || row[column] == null || row[column] == undefined
                  ).length;
                  const uniqueValuesArray = Array.from(uniqueValues);
                  const displayLimit = 5;
                  const displayText = uniqueValuesArray.length > displayLimit
                    ? `${uniqueValuesArray.slice(0, displayLimit).join(', ')} 他${uniqueValuesArray.length - displayLimit}件`
                    : uniqueValuesArray.join(', ');
                  return (
                    <tr key={column}>
                      <td>{column}</td>
                      <td>{EmptyCount}</td>
                      <td>{uniqueValues.size}</td>
                      <td>{displayText}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'correlation' && numericColumns.length > 1 && (
          <div className="correlation-analysis">
            <h3>相関係数分析</h3>
            <div className="correlation-layout">
              <div className="correlation-controls-left">
                <CustomSelect
                  label="分析タイプ:"
                  id="correlation-type"
                  value={correlationType}
                  onChange={setCorrelationType}
                  options={[
                    { value: 'correlation', label: '単純相関係数' },
                    { value: 'partial', label: '偏相関係数' }
                  ]}
                  placeholder="分析タイプを選択"
                />

                <CustomSelect
                  label="基準列を選択:"
                  id="correlation-column"
                  value={selectedColumn}
                  onChange={setSelectedColumn}
                  options={[
                    { value: '', label: '選択してください' },
                    ...numericColumns.map(column => ({ value: column, label: column }))
                  ]}
                  placeholder="基準列を選択"
                />

                {correlationType === 'partial' && (
                  <div className="control-variables">
                    <label>制御変数（複数選択可）:</label>
                    {numericColumns
                      .filter(col => col !== selectedColumn)
                      .map(column => (
                        <div key={column} className="control-variable-item">
                          <input
                            type="checkbox"
                            id={`control-${column}`}
                            checked={controlColumns.includes(column)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setControlColumns(prev => [...prev, column]);
                              } else {
                                setControlColumns(prev => prev.filter(col => col !== column));
                              }
                            }}
                          />
                          <label htmlFor={`control-${column}`}>{column}</label>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="correlation-results-right">
                {selectedColumn && correlationData.length > 0 ? (
                  <div className="correlation-results">
                    <h4>
                      {selectedColumn} との{correlationType === 'partial' ? '偏相関係数' : '相関係数'}
                      {correlationType === 'partial' && controlColumns.length > 0 &&
                        ` (制御変数: ${controlColumns.join(', ')})`
                      }
                    </h4>
                    <table className="correlation-table">
                      <thead>
                        <tr>
                          <th>列名</th>
                          <th>{correlationType === 'partial' ? '偏相関係数' : '相関係数'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {correlationData.map(({ column, correlation }) => {
                          return (
                            <tr key={column}>
                              <td>{column}</td>
                              <td className={correlation > 0 ? 'positive' : 'negative'}>
                                {correlation.toFixed(3)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : selectedColumn ? (
                  <div className="correlation-placeholder">
                    <p>{correlationType === 'partial' ? '偏相関係数' : '相関係数'}を計算できる他の数値列がありません。</p>
                  </div>
                ) : (
                  <div className="correlation-placeholder">
                    <p>基準列を選択してください。</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'timeseries' && (
            <div className="timeseries-analysis">
                <h3>時系列分析</h3>
                <div className="correlation-layout">
                    <div className="correlation-controls-left">
                        <CustomSelect
                            label="分析対象列:"
                            id="timeseries-column"
                            value={tsTargetColumn}
                            onChange={setTsTargetColumn}
                            options={[
                                { value: '', label: '選択してください' },
                                ...numericColumns.map(column => ({ value: column, label: column }))
                            ]}
                            placeholder="分析対象列を選択"
                        />
                        <button 
                            className="primary-button" 
                            onClick={handleTimeSeriesAnalyze} 
                            disabled={!tsTargetColumn || tsLoading || !s3Key}
                            style={{marginTop: '1rem', width: '100%'}}
                        >
                            {tsLoading ? '分析中...' : '分析実行'}
                        </button>
                        {!s3Key && <p className="error-message" style={{marginTop: '0.5rem', fontSize: '0.8rem'}}>※この機能はクラウド保存済みファイルでのみ利用可能です。</p>}
                        {tsError && <p className="error-message" style={{marginTop: '0.5rem'}}>{tsError}</p>}
                    </div>
                    <div className="correlation-results-right">
                        {tsResult ? (
                            <div className="timeseries-results">
                                <h4>自己相関係数 (ACF)</h4>
                                {acfChartData && (
                                    <div style={{height: '300px', width: '100%'}}>
                                        <Bar 
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: {
                                                    legend: { position: 'top' },
                                                    title: { display: true, text: 'Autocorrelation Function' },
                                                },
                                                scales: {
                                                    y: {
                                                        min: -1,
                                                        max: 1,
                                                    }
                                                }
                                            }} 
                                            data={acfChartData} 
                                        />
                                    </div>
                                )}
                                <div style={{marginTop: '1rem'}}>
                                    <h5>基本統計量</h5>
                                    <ul>
                                        <li>平均: {tsResult.stats.mean.toFixed(4)}</li>
                                        <li>標準偏差: {tsResult.stats.std.toFixed(4)}</li>
                                        <li>最大: {tsResult.stats.max}</li>
                                        <li>最小: {tsResult.stats.min}</li>
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <div className="correlation-placeholder">
                                <p>分析対象列を選択して実行してください。</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}

export default DataSummary;