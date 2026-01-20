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

    // 1. バックエンドへアップロード (保存用)
    if (token) {
        try {
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
            let uploadSuccess = false;
            let responseData = null;

            // A. Direct S3 Upload (Try this first)
            try {
                // 1. Get Presigned URL
                const presignRes = await fetch(`${API_BASE_URL}/generate-upload-url?filename=${encodeURIComponent(file.name)}&file_type=${encodeURIComponent(file.type)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (presignRes.ok) {
                    const { url, s3_key } = await presignRes.json();
                    
                    // 2. Upload to S3
                    const uploadRes = await fetch(url, {
                        method: 'PUT',
                        body: file,
                        headers: {
                            'Content-Type': file.type
                        }
                    });

                    if (uploadRes.ok) {
                        // 3. Notify Backend
                        const completeRes = await fetch(`${API_BASE_URL}/upload/complete`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ s3_key, filename: file.name })
                        });

                        if (completeRes.ok) {
                            responseData = await completeRes.json();
                            uploadSuccess = true;
                            console.log("Direct S3 Upload Successful");
                        } else {
                             const err = await completeRes.json();
                             throw new Error(err.detail || "Completion failed");
                        }
                    } else {
                        throw new Error("S3 PUT failed");
                    }
                } else {
                    throw new Error("Failed to get presigned URL"); // Trigger fallback
                }
            } catch (s3Error) {
                console.warn("Direct S3 upload failed, falling back to proxy upload:", s3Error);
                // Fallback will proceed below if uploadSuccess is false
            }

            // B. Fallback to Proxy Upload (Original Method)
            if (!uploadSuccess) {
                const formData = new FormData();
                formData.append('file', file);

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
                responseData = await res.json();
            }

            // アップロード成功後に一覧更新コールバックを呼ぶ
            if (onUploadComplete) {
                onUploadComplete();
            }

        } catch (e) {
            console.error("Upload failed", e);
            onError(`アップロードエラー: ${e.message}`);
            setUploading(false); // エラー時はここでフラグを戻す（パース処理に行かない場合）
            return; // パース処理をスキップ
        }
    } else {
        onError("ログインが必要です");
        setUploading(false);
        return;
    }

    // 2. ローカルパース (即時表示用) - アップロード後に実行
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        setUploading(false);
        if (results.data.length > 0) {
          // Pass s3_key and upload_id if available from responseData
          const metadata = responseData ? {
              s3_key: responseData.s3_key,
              upload_id: responseData.upload_id
          } : {};
          onDataParsed(results.data, file.name, metadata);
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