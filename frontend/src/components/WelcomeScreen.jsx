import React from 'react';
import './WelcomeScreen.css';

const WelcomeScreen = ({ onDataParsed, onError }) => {
  const handleFileUpload = (event) => {
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
        
        onDataParsed(data, file.name);
      } catch (error) {
        onError(`CSVファイルの解析に失敗しました: ${error.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div className="welcome-header">
          <img src="/logo.png" alt="Logo" className="welcome-logo" />
          <h1>Data Science on Webへようこそ</h1>
          <p className="welcome-subtitle">ブラウザ上で手軽にデータ分析・可視化・機械学習を実行できます</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>データ集計</h3>
            <p>基本統計量の算出やデータの概要を瞬時に把握できます</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📈</div>
            <h3>可視化</h3>
            <p>散布図、棒グラフ、ヒートマップなど多彩なグラフを作成</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3>機械学習</h3>
            <p>回帰分析やクラスタリングなどの分析手法をノーコードで</p>
          </div>
        </div>

        <div className="action-area">
          <label className="upload-button-large">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
            />
            <span className="icon">📂</span>
            CSVファイルをアップロードして開始
          </label>
          <p className="upload-hint">または、CSVファイルをここにドラッグ＆ドロップ（実装予定）</p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
