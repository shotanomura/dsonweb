// src/CsvUploader.jsx
import React from 'react';
import Papa from 'papaparse';
import { useAuth } from './context/AuthContext';

function CsvUploader({ onDataParsed, onError, onUploadComplete, id, className, children }) {
  const { token } = useAuth(); // AuthContextからトークンを取得

  const [uploading, setUploading] = React.useState(false);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // ファイルサイズチェック (500MB)
    const MAX_SIZE = 500 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        onError("ファイルサイズが大きすぎます（上限500MB）");
        return;
    }
    
    setUploading(true);

    // 1. バックエンドへアップロード (保存用) - 先に実行して完了を待つ
    if (token) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
            const res = await fetch(`${API_BASE_URL}/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || errData.error || `Upload failed with status ${res.status}`);
            }

            // アップロード成功後に一覧更新コールバックを呼ぶ
            if (onUploadComplete) {
                onUploadComplete();
            }
        } catch (e) {
            console.error("Upload failed", e);
            onError(`アップロードエラー: ${e.message}`);
        }
    }

    // 2. ローカルパース (即時表示用) - アップロード後に実行
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        setUploading(false);
        if (results.data.length > 0) {
          onDataParsed(results.data, file.name);
        } else {
          onError('CSVファイルが空か、内容を読み取れませんでした。');
        }
      },
      error: (err) => {
        setUploading(false);
        onError(`ファイルの解析に失敗しました: ${err.message}`);
      },
    });
  };

  return (
      <label className={className} htmlFor={id}>
        <input
          id={id}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          disabled={uploading}
        />
        {uploading ? "アップロード中..." : children}
      </label>
  );
}

export default CsvUploader;