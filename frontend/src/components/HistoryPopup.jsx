import React from 'react';
import CsvUploader from '../CsvUploader';

function HistoryPopup({ isOpen, onClose, fileList, onSelectFile, onDataParsed, onError, onUploadComplete, onDeleteFile }) {
    if (!isOpen) return null;

    const MAX_FILES = 5;
    const isLimitReached = fileList.length >= MAX_FILES;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
        }} onClick={onClose}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                width: '500px',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden'
            }} onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div style={{
                    padding: '1rem',
                    borderBottom: '1px solid #e9ecef',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#343a40' }}>ファイル</h2>
                        <span style={{ fontSize: '0.85rem', color: isLimitReached ? '#fa5252' : '#868e96' }}>
                            現在: {fileList.length} / 最大: {MAX_FILES}
                        </span>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        color: '#868e96'
                    }}>&times;</button>
                </div>

                {/* List */}
                <div style={{
                    padding: '1rem',
                    overflowY: 'auto',
                    flex: 1
                }}>
                    {fileList.length === 0 ? (
                        <p style={{ color: '#868e96', textAlign: 'center', marginTop: '2rem' }}>履歴はありません</p>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {fileList.map((file) => (
                                <li key={file.upload_id}
                                    onClick={() => {
                                        onSelectFile(file.s3_key, file.filename);
                                        onClose();
                                    }}
                                    style={{
                                        padding: '1rem',
                                        borderBottom: '1px solid #f1f3f5',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <div>
                                        <div style={{ fontWeight: 500, color: '#495057' }}>{file.filename}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#adb5bd' }}>
                                            {new Date(file.upload_date).toLocaleString('ja-JP')}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.85rem', color: '#228be6' }}>開く</span>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if(window.confirm(`${file.filename} を削除しますか？`)) {
                                                    onDeleteFile(file.upload_id);
                                                }
                                            }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontSize: '1.2rem',
                                                color: '#fa5252',
                                                padding: '0 0.5rem'
                                            }}
                                            title="削除"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Footer / Add Button */}
                <div style={{
                    padding: '1rem',
                    borderTop: '1px solid #e9ecef',
                    backgroundColor: '#f8f9fa',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '1rem',
                    alignItems: 'center'
                }}>
                     {isLimitReached && <span style={{fontSize: '0.85rem', color:'#fa5252'}}>上限に達しました</span>}
                     {isLimitReached ? (
                         <button disabled style={{
                             padding: '0.5rem 1rem',
                             backgroundColor: '#adb5bd',
                             color: 'white',
                             border: 'none',
                             borderRadius: '4px',
                             cursor: 'not-allowed'
                         }}>+ 新しく追加</button>
                     ) : (
                        <CsvUploader
                            id="popup-add-upload"
                            className="add-button"
                            onDataParsed={(data, filename) => {
                                onDataParsed(data, filename);
                                onClose();
                            }}
                            onError={onError}
                            onUploadComplete={onUploadComplete}
                        >
                            <span style={{
                                display: 'inline-block',
                                padding: '0.5rem 1rem',
                                backgroundColor: '#228be6',
                                color: 'white',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 500,
                                fontSize: '0.9rem'
                            }}>
                                + 新しく追加
                            </span>
                        </CsvUploader>
                     )}
                </div>
            </div>
        </div>
    );
}

export default HistoryPopup;
