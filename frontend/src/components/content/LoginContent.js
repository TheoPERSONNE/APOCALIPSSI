import React, { useState } from 'react';
import './ContentStyles.css';

const LoginContent = ({ onNavigate, onLogin }) => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Login submitted:', formData);
        onLogin();
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

            <form className="auth-form" onSubmit={handleSubmit}>
                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    className="auth-input"
                    value={formData.email}
                    onChange={handleChange}
                    required
                />

                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    className="auth-input"
                    value={formData.password}
                    onChange={handleChange}
                    required
                />

                <button type="submit" className="auth-btn">
                    Login
                </button>
            </form>
        </div>
    );
};

export default LoginContent;
