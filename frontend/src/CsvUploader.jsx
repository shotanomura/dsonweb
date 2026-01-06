// src/CsvUploader.jsx
import React from 'react';
import Papa from 'papaparse';
import { useAuth } from './context/AuthContext';

function CsvUploader({ onDataParsed, onError }) {
  const { token } = useAuth(); // AuthContextからトークンを取得

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // ローカルパースとバックエンドアップロードを並行して行うか、
    // ここではシンプルに両方トリガーします。
    
    // 1. ローカルパース (即時表示用)
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length > 0) {
          onDataParsed(results.data, file.name);
        } else {
          onError('CSVファイルが空か、内容を読み取れませんでした。');
        }
      },
      error: (err) => {
        onError(`ファイルの解析に失敗しました: ${err.message}`);
      },
    });

    // 2. バックエンドへアップロード (保存用)
    if (token) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
            await fetch(`${API_BASE_URL}/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            // アップロード成功後に一覧更新などのコールバックがあれば呼ぶ
            // 今回はDashboard側で再取得などを検討
        } catch (e) {
            console.error("Upload failed", e);
            // アップロード失敗してもローカル作業は続行可能なのでエラーは表示しない、または控えめに
        }
    }
  };

  return (
    <>
      <label className="file-uploader-label" htmlFor="csvUploader">
        ファイルを選択
      </label>
      <input
        id="csvUploader"
        type="file"
        accept=".csv"
        onChange={handleFileChange}
      />
    </>
  );
}

export default CsvUploader;