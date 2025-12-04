import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './ProfilePopup.css';

interface ProfilePopupProps {
    isOpen: boolean;
    onClose: () => void;
}

interface UserData {
    firstName: string;
    lastName: string;
    email: string;
    memberSince: string; // YYYY-MM-DD
}

export default function ProfilePopup({ isOpen, onClose }: ProfilePopupProps) {
    const [userData, setUserData] = useState<UserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [error, setError] = useState('');
    const { logout } = useAuth();

    useEffect(() => {
        if (isOpen) {
            fetchUserData();
        }
    }, [isOpen]);

    const fetchUserData = async () => {
        setIsLoading(true);
        setError('');
        try {
            const user = await api.getCurrentUser();
            if (user) {
                const rawCreated = user.created_at || '';
                const memberSince = typeof rawCreated === 'string' ? rawCreated.substring(0, 10) : '';
                setUserData({
                    firstName: user.first_name || '',
                    lastName: user.last_name || '',
                    email: user.email || '',
                    memberSince
                });
            } else {
                setError('Failed to load user data');
            }
        } catch (err) {
            console.error('Error fetching user data:', err);
            setError('Failed to load user data');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleSignOut = async () => {
        setIsLoggingOut(true);
        try {
            // Call logout from AuthContext
            // This will handle API call, cleanup, navigation, and notify other tabs
            await logout();
            
            // Close the popup
            onClose();
        } catch (err) {
            console.error('Error signing out:', err);
            // AuthContext logout handles cleanup even on error
            onClose();
        } finally {
            setIsLoggingOut(false);
        }
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
                    {isLoading ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                            Loading...
                        </div>
                    ) : error ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '20px',
                            color: '#ea4335',
                            background: '#fce8e6',
                            borderRadius: '8px',
                            marginBottom: '16px'
                        }}>
                            {error}
                        </div>
                    ) : userData ? (
                        <>
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
                                <label>Member Since</label>
                                <div className="profile-value">{userData.memberSince || '-'}</div>
                            </div>
                        </>
                    ) : null}

                    <div className="profile-actions">
                        <button 
                            className="sign-out-button" 
                            onClick={handleSignOut}
                            disabled={isLoggingOut}
                        >
                            <span className="material-icons-round">logout</span>
                            {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

