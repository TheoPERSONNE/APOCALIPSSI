import React, { useState } from 'react';
import { useAuth } from '../../context/authContext';
import './UploadContent.css';

const LoginContent = ({ onNavigate, onLogin }) => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const { login } = useAuth();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const result = await login(formData);

        if (result.success) {
            onLogin();
        } else {
            setError(result.error);
        }
        setIsLoading(false);
    };

    return (
        <div className="auth-card">
            <h1>Login</h1>
            <p className="auth-subtitle">
                Doesn't have an account?
                <button type="button" className="auth-link" onClick={() => onNavigate('register')}>
                    Create yours
                </button>
            </p>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            <form className="auth-form" onSubmit={handleSubmit}>
                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    className="auth-input"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                />

                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    className="auth-input"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                />

                <button type="submit" className="auth-btn" disabled={isLoading}>
                    {isLoading ? 'Connexion...' : 'Login'}
                </button>
            </form>
        </div>
    );
};

export default LoginContent;
