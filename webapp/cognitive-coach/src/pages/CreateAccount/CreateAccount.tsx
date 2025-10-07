import React, { useState } from 'react';
import './CreateAccount.css';
import { useNavigate } from 'react-router-dom';

export default function CreateAccount() {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Basic validation
        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }
        
        if (!agreeToTerms) {
            alert('Please agree to the terms and conditions');
            return;
        }

        // TODO: Implement account creation logic
        console.log('Account creation attempt:', { 
            firstName, 
            lastName, 
            email, 
            password 
        });
        
        // For now, redirect to login after "creating" account
        navigate('/login');
    };

    return (
        <div className="auth-page create-account-page">
            <div className="auth-container create-account-container">
                <div className="auth-form create-account-form">
                    <div className="brand">
                        <div className="brand-logo">
                            <div className="brand-icon">
                                <span className="material-icons-round">psychology</span>
                            </div>
                        </div>
                        <h1>Study Coach</h1>
                        <p>Create your account</p>
                    </div>

                    <div className="form-section">
                        <form onSubmit={handleSubmit}>
                            <div className="name-fields">
                                <div className="form-field">
                                    <input 
                                        type="text" 
                                        id="firstName" 
                                        name="firstName" 
                                        placeholder=" " 
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required 
                                    />
                                    <label htmlFor="firstName">First Name</label>
                                </div>

                                <div className="form-field">
                                    <input 
                                        type="text" 
                                        id="lastName" 
                                        name="lastName" 
                                        placeholder=" " 
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required 
                                    />
                                    <label htmlFor="lastName">Last Name</label>
                                </div>
                            </div>

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

                            <div className="form-field">
                                <input 
                                    type="password" 
                                    id="confirmPassword" 
                                    name="confirmPassword" 
                                    placeholder=" " 
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required 
                                />
                                <label htmlFor="confirmPassword">Confirm Password</label>
                            </div>

                            <div className="privacy-notice">
                                <h4>
                                    <span className="material-icons-round" style={{fontSize: '16px'}}>shield</span>
                                    Privacy-first design
                                </h4>
                                <p>Your study data stays on your device unless you choose cloud features. We never share your personal information.</p>
                            </div>

                            <div className="terms-agreement">
                                <label className="terms-checkbox">
                                    <input 
                                        type="checkbox" 
                                        name="agreeToTerms"
                                        checked={agreeToTerms}
                                        onChange={(e) => setAgreeToTerms(e.target.checked)}
                                        required
                                    />
                                    <span>I agree to the <a href="#" className="terms-link">Terms of Service</a> and <a href="#" className="terms-link">Privacy Policy</a></span>
                                </label>
                            </div>

                            <div className="create-account-actions">
                                <button type="submit" className="primary-button">
                                    <span className="material-icons-round">person_add</span>
                                    Create Account
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="login-link">
                        Already have an account? <a href="/login">Sign in</a>
                    </div>
                </div>
            </div>
        </div>
    );
}