import React from 'react';
import './Header.css';

function Header({
  data,
  filename,
  error,
  activeTab,
  onDataParsed,
  onError,
  onTabChange
}) {
  return (
    <header className="app-header">
      <div className="header-main">
        <div className="header-left">
          <div className="logo-title-container">
            <img 
              src="/logo.png" 
              alt="Data Science on Web Logo" 
              className="header-logo" 
            />
            <h1>Data Science on Web</h1>
          </div>
          {data.length > 0 && (
            <nav className="header-tabs">
              <button 
                className={`tab-button ${activeTab === 'data' ? 'active' : ''}`}
                onClick={() => onTabChange('data')}
              >
                データ
              </button>
              <button 
                className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
                onClick={() => onTabChange('summary')}
              >
                データ集計
              </button>
              <button 
                className={`tab-button ${activeTab === 'graph' ? 'active' : ''}`}
                onClick={() => onTabChange('graph')}
              >
                グラフ
              </button>
              <button 
                className={`tab-button ${activeTab === 'ml' ? 'active' : ''}`}
                onClick={() => onTabChange('ml')}
              >
                機械学習
              </button>
            </nav>
          )}
        </div>
        
        <div className="header-right">
          <div className="file-section">
            {filename ? (
              <div className="file-info">
                <span className="filename-text">
                  読み込み済み: {filename}
                </span>
                <label className="file-change-button">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        // CsvUploaderの処理をここで実行
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          try {
                            const csv = event.target.result;
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
                            
                            onDataParsed(data, file.name);
                          } catch (error) {
                            onError(`CSVファイルの解析に失敗しました: ${error.message}`);
                          }
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                  変更
                </label>
              </div>
            ) : (
              <label className="file-uploader-label">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        try {
                          const csv = event.target.result;
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
                          
                          onDataParsed(data, file.name);
                        } catch (error) {
                          onError(`CSVファイルの解析に失敗しました: ${error.message}`);
                        }
                      };
                      reader.readAsText(file);
                    }
                  }}
                />
                CSVファイルを選択
              </label>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="error-section">
          <p className="error">{error}</p>
        </div>
      )}
    </header>
  );
}

export default Header;
