// src/CsvUploader.jsx
import React from 'react';
import Papa from 'papaparse';

function CsvUploader({ onDataParsed, onError }) {
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length > 0) {
          onDataParsed(results.data, file.name); // ファイル名も一緒に渡す
        } else {
          onError('CSVファイルが空か、内容を読み取れませんでした。');
        }
      },
      error: (err) => {
        onError(`ファイルの解析に失敗しました: ${err.message}`);
      },
    });
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