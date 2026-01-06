import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './WelcomeScreen.css'; // Reusing WelcomeScreen styles

const Register = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Registration failed');
            }

            // Redirect to login after successful registration
            navigate('/login');
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="welcome-screen" style={{ height: '100vh', overflow: 'hidden', padding: '0' }}>
            <div className="welcome-content" style={{ 
                maxWidth: '1200px', 
                margin: '0 auto', 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '4rem',
                padding: '2rem'
            }}>
                <div className="welcome-left" style={{ flex: 1, textAlign: 'left' }}>
                    <div className="welcome-header" style={{ marginBottom: '2rem', textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <img src="/logo.png" alt="Logo" className="welcome-logo" style={{ width: '60px', height: '60px', margin: 0 }} />
                            <h1 style={{ margin: 0, fontSize: '2.5rem' }}>Data Science on Web</h1>
                        </div>
                        <p className="welcome-subtitle" style={{ textAlign: 'left' }}>ブラウザ上で手軽にデータ分析・可視化・機械学習を実行できます</p>
                    </div>

                    <div className="features-grid" style={{ 
                        gridTemplateColumns: '1fr', 
                        gap: '1.5rem', 
                        margin: 0,
                        textAlign: 'left'
                    }}>
                        <div className="feature-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <div className="feature-icon" style={{ fontSize: '2rem', margin: 0 }}>📊</div>
                            <div>
                                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>データ集計</h3>
                                <p style={{ fontSize: '0.9rem', margin: 0 }}>基本統計量の算出やデータの概要を瞬時に把握できます</p>
                            </div>
                        </div>
                        <div className="feature-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <div className="feature-icon" style={{ fontSize: '2rem', margin: 0 }}>📈</div>
                            <div>
                                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>可視化</h3>
                                <p style={{ fontSize: '0.9rem', margin: 0 }}>散布図、棒グラフ、ヒートマップなど多彩なグラフを作成</p>
                            </div>
                        </div>
                        <div className="feature-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <div className="feature-icon" style={{ fontSize: '2rem', margin: 0 }}>🤖</div>
                            <div>
                                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>機械学習</h3>
                                <p style={{ fontSize: '0.9rem', margin: 0 }}>回帰分析やクラスタリングなどの分析手法をノーコードで</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="welcome-right" style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    <div className="login-container" style={{ 
                        background: 'white', 
                        padding: '2.5rem', 
                        borderRadius: '12px', 
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                        maxWidth: '400px',
                        width: '100%',
                        margin: 0
                    }}>
                        <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#333' }}>新規登録</h2>
                        {error && <p style={{ color: '#e03131', background: '#fff5f5', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</p>}
                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#495057', fontSize: '0.9rem' }}>ユーザー名</label>
                                <input 
                                    type="text" 
                                    value={username} 
                                    onChange={(e) => setUsername(e.target.value)} 
                                    required 
                                    style={{ 
                                        width: '100%', 
                                        padding: '0.75rem', 
                                        border: '1px solid #dee2e6', 
                                        borderRadius: '6px',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#495057', fontSize: '0.9rem' }}>メールアドレス</label>
                                <input 
                                    type="email" 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    style={{ 
                                        width: '100%', 
                                        padding: '0.75rem', 
                                        border: '1px solid #dee2e6', 
                                        borderRadius: '6px',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#495057', fontSize: '0.9rem' }}>パスワード</label>
                                <input 
                                    type="password" 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    required 
                                    style={{ 
                                        width: '100%', 
                                        padding: '0.75rem', 
                                        border: '1px solid #dee2e6', 
                                        borderRadius: '6px',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>
                            <button type="submit" style={{ 
                                width: '100%', 
                                padding: '0.8rem', 
                                cursor: 'pointer',
                                background: 'var(--accent-primary, #339af0)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '1rem',
                                fontWeight: '600',
                                transition: 'background-color 0.2s',
                                marginBottom: '1rem'
                            }}>
                                登録する
                            </button>
                        </form>
                        <p style={{ textAlign: 'center', fontSize: '0.9rem', color: '#868e96' }}>
                            すでにアカウントをお持ちの方は <Link to="/login" style={{ color: 'var(--accent-primary, #339af0)', textDecoration: 'none' }}>ログイン</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
