import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ProfilePopup.css';

interface ProfilePopupProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ProfilePopup({ isOpen, onClose }: ProfilePopupProps) {
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    
    // Fake user data
    const userData = {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@email.com",
        password: "password123"
    };

    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const handleSignOut = () => {
        onClose(); // Close the popup first
        navigate('/login'); // Navigate to login page
    };

    return (
        <div className="profile-popup-overlay" onClick={handleOverlayClick}>
            <div className="profile-popup">
                <div className="profile-popup-header">
                    <h3>Profile Information</h3>
                    <button className="close-button" onClick={onClose}>
                        <span className="material-icons-round">close</span>
                    </button>
                </div>
                
                <div className="profile-popup-content">
                    <div className="profile-field">
                        <label>First Name</label>
                        <div className="profile-value">{userData.firstName}</div>
                    </div>
                    
                    <div className="profile-field">
                        <label>Last Name</label>
                        <div className="profile-value">{userData.lastName}</div>
                    </div>
                    
                    <div className="profile-field">
                        <label>Email</label>
                        <div className="profile-value">{userData.email}</div>
                    </div>
                    
                    <div className="profile-field">
                        <label>Password</label>
                        <div className="profile-password-container">
                            <div className="profile-value">
                                {showPassword ? userData.password : '••••••••'}
                            </div>
                            <button 
                                className="password-toggle-button"
                                onClick={togglePasswordVisibility}
                                title={showPassword ? 'Hide password' : 'Show password'}
                            >
                                <span className="material-icons-round">
                                    {showPassword ? 'visibility_off' : 'visibility'}
                                </span>
                            </button>
                        </div>
                    </div>
                    
                    <div className="profile-actions">
                        <button className="sign-out-button" onClick={handleSignOut}>
                            <span className="material-icons-round">logout</span>
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}