import React, { useState } from 'react';
import './Login.css';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { refreshAuth } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await api.login(email, password);
            console.log('Login successful:', response);
            
            // Store user info in localStorage if remember me is checked
            if (rememberMe) {
                localStorage.setItem('user', JSON.stringify(response.user));
            }
            
            // Refresh auth context and notify other tabs
            await refreshAuth();
            
            // Redirect to dashboard
            navigate('/');
        } catch (err: any) {
            console.error('Login failed:', err);
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page login-page">
            <div className="auth-container login-container">
                <div className="auth-form login-form">
                    <div className="brand">
                        <div className="brand-logo">
                            <div className="brand-icon">
                                <span className="material-icons-round">psychology</span>
                            </div>
                        </div>
                        <h1>Study Coach</h1>
                        <p>Sign in to your account</p>
                    </div>

                    <div className="form-section">
                        <form onSubmit={handleSubmit}>
                            {error && (
                                <div style={{
                                    background: '#fce8e6',
                                    border: '1px solid #ea4335',
                                    color: '#c5221f',
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    marginBottom: '16px',
                                    fontSize: '14px'
                                }}>
                                    {error}
                                </div>
                            )}

                            <div className="form-field">
                                <input 
                                    type="email" 
                                    id="email" 
                                    name="email" 
                                    placeholder=" " 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required 
                                    disabled={isLoading}
                                />
                                <label htmlFor="email">Email</label>
                            </div>

                            <div className="form-field">
                                <input 
                                    type="password" 
                                    id="password" 
                                    name="password" 
                                    placeholder=" " 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required 
                                    disabled={isLoading}
                                />
                                <label htmlFor="password">Password</label>
                            </div>

                            <div className="privacy-notice">
                                <h4>
                                    <span className="material-icons-round" style={{fontSize: '16px'}}>shield</span>
                                    Privacy-first design
                                </h4>
                                <p>Your study data stays on your device unless you choose cloud features.</p>
                            </div>

                            <div className="login-options">
                                <label className="remember-me">
                                    <input 
                                        type="checkbox" 
                                        name="remember"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        disabled={isLoading}
                                    />
                                    <span>Stay signed in</span>
                                </label>
                                <a href="#" className="forgot-password">Forgot password?</a>
                            </div>

                            <div className="login-actions">
                                <button 
                                    type="submit" 
                                    className="primary-button"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <span className="material-icons-round">hourglass_empty</span>
                                            Signing in...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-icons-round">arrow_forward</span>
                                            Continue
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="signup-link">
                        New to Study Coach? <a href="/signup">Create account</a>
                    </div>
                </div>
            </div>
        </div>
    );
}