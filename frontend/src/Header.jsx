import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import './Header.css';

function Header({
  data,
  filename,
  error,
  activeTab,
  onDataParsed,
  onError,
  onTabChange,
  onUploadComplete,
  onToggleHistory
}) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
          <button 
            className="history-button"
            onClick={onToggleHistory}
            title={filename || "ファイルを開く"}
            style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 500,
                color: '#495057',
                maxWidth: '200px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textAlign: 'center',
                marginRight: '1rem'
            }}
          >
            {filename || "ファイルを開く"}
          </button>

          <div className="hamburger-menu-container">
            <button 
              className={`hamburger-button ${isMenuOpen ? 'open' : ''}`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
            
            {isMenuOpen && (
              <div className="menu-dropdown">
                <button onClick={handleLogout} className="menu-item logout">
                  ログアウト
                </button>
              </div>
            )}
            
            {isMenuOpen && (
              <div 
                className="menu-backdrop" 
                onClick={() => setIsMenuOpen(false)} 
              />
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
