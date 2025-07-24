// src/DataTable.jsx
import React, { useState } from 'react';

function DataTable({ columns, data }) {
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 5;
  
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, data.length);
  const currentData = data.slice(startIndex, endIndex);

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (data.length === 0) {
    return <p>データをアップロードしてください。</p>;
  }

  return (
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={index}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {currentData.map((row, index) => (
            <tr key={startIndex + index}>
              {columns.map((column, colIndex) => (
                <td key={colIndex}>{row[column]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="pagination-controls">
        <button 
          onClick={goToPrevPage} 
          disabled={currentPage === 0}
          className="pagination-button"
        >
          前へ
        </button>
        
        <span className="pagination-info">
          {startIndex + 1}-{endIndex} / {data.length}
        </span>
        
        <button 
          onClick={goToNextPage} 
          disabled={currentPage >= totalPages - 1}
          className="pagination-button"
        >
          次へ
        </button>
      </div>
    </div>
  );
}

export default DataTable;