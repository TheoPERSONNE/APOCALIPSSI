import React, { useState } from 'react';
import './ContentStyles.css';

const RegisterContent = ({ onNavigate }) => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
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
        console.log('Register submitted:', formData);
    };

    return (
        <div className="auth-card">
            <h1>Create an Account</h1>
            <p className="auth-subtitle">
                Already have an account?
                <button type="button" className="auth-link" onClick={() => onNavigate('login')}>
                    Log in
                </button>
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
                <div className="form-row">
                    <input
                        type="text"
                        name="firstName"
                        placeholder="First Name"
                        className="auth-input"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="text"
                        name="lastName"
                        placeholder="Last Name"
                        className="auth-input"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                    />
                </div>

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
                    Create account
                </button>
            </form>
        </div>
    );
};

export default RegisterContent;
