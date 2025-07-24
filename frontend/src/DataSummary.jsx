import React, { useState, useMemo } from 'react';
import CustomSelect from './components/CustomSelect';

function DataSummary({ columns, data }) {
  const [selectedColumn, setSelectedColumn] = useState('');
  const [correlationType, setCorrelationType] = useState('correlation'); // 'correlation' or 'partial'
  const [controlColumns, setControlColumns] = useState([]);

  if (!data || data.length === 0) {
    return <div>データがありません</div>;
  }

  // 数値列を特定する関数
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

  // 相関係数を計算する関数
  const calculateCorrelation = (col1, col2) => {
    // 両方の列が有効な数値を持つ行のみを抽出
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

  // 偏相関係数を計算する関数
  const calculatePartialCorrelation = (col1, col2, controlCols) => {
    if (controlCols.length === 0) {
      return calculateCorrelation(col1, col2);
    }

    // 有効な行のみを抽出
    const validRows = data.filter(row => {
      const allCols = [col1, col2, ...controlCols];
      return allCols.every(col => {
        const val = row[col];
        return val !== null && val !== '' && val !== undefined && !isNaN(Number(val));
      });
    });

    if (validRows.length < controlCols.length + 3) return null;

    // データ行列を作成
    const matrix = validRows.map(row => [col1, col2, ...controlCols].map(col => Number(row[col])));
    
    // 相関行列を計算
    const corrMatrix = calculateCorrelationMatrix(matrix);
    
    if (!corrMatrix || corrMatrix.length < 2) return null;

    // 偏相関係数を計算（逆行列を使用）
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

  // 相関行列を計算
  const calculateCorrelationMatrix = (matrix) => {
    const n = matrix.length;
    const p = matrix[0].length;
    
    // 平均を計算
    const means = [];
    for (let j = 0; j < p; j++) {
      means[j] = matrix.reduce((sum, row) => sum + row[j], 0) / n;
    }

    // 相関行列を計算
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

  // 行列の逆行列を計算（ガウス・ジョーダン法）
  const invertMatrix = (matrix) => {
    const n = matrix.length;
    const augmented = matrix.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]);
    
    // ガウス・ジョーダン法
    for (let i = 0; i < n; i++) {
      // ピボット選択
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }
      
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
      
      // 対角要素が0の場合は計算不可
      if (Math.abs(augmented[i][i]) < 1e-10) return null;
      
      // 行を正規化
      const pivot = augmented[i][i];
      for (let j = 0; j < 2 * n; j++) {
        augmented[i][j] /= pivot;
      }
      
      // 他の行を消去
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = augmented[k][i];
          for (let j = 0; j < 2 * n; j++) {
            augmented[k][j] -= factor * augmented[i][j];
          }
        }
      }
    }
    
    // 逆行列部分を抽出
    return augmented.map(row => row.slice(n));
  };

  // 選択した列との相関係数または偏相関係数を計算
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

  // 統計を計算する関数
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
        

      {numericColumns.length > 0 && (
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
              return (
                <tr key={column}>
                  <td>{column}</td>
                  <td>{EmptyCount}</td>
                  <td>{uniqueValues.size}</td>
                  <td>{Array.from(uniqueValues).join(', ')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

        {/* 相関係数分析セクション */}
      {numericColumns.length > 1 && (
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
    </div>
  );
}

export default DataSummary;