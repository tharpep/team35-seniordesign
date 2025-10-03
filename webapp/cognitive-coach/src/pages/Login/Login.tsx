import React, { useState } from 'react';
import './Login.css';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Implement login logic
        console.log('Login attempt:', { email, password, rememberMe });
        // For now, just redirect to dashboard after "login"
        navigate('/');
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-form">
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
                            <div className="form-field">
                                <input 
                                    type="email" 
                                    id="email" 
                                    name="email" 
                                    placeholder=" " 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required 
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
                                    />
                                    <span>Stay signed in</span>
                                </label>
                                <a href="#" className="forgot-password">Forgot password?</a>
                            </div>

                            <div className="login-actions">
                                <button type="submit" className="primary-button">
                                    <span className="material-icons-round">arrow_forward</span>
                                    Continue
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
