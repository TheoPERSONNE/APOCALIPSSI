import React, { useState } from 'react';
import { useAuth } from '../../context/authContext';
import './UploadContent.css';

const RegisterContent = ({ onNavigate }) => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const { register } = useAuth();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // Adapter les données pour ton backend
        const userData = {
            nom: `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
            mot_de_passe: formData.password
        };

        const result = await register(userData);

        if (result.success) {
            setSuccess('Compte créé avec succès ! Vous pouvez maintenant vous connecter.');
            setTimeout(() => {
                onNavigate('login');
            }, 2000);
        } else {
            setError(result.error);
        }
        setIsLoading(false);
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

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {success && (
                <div className="success-message">
                    {success}
                </div>
            )}

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
                        disabled={isLoading}
                    />
                    <input
                        type="text"
                        name="lastName"
                        placeholder="Last Name"
                        className="auth-input"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
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
                    {isLoading ? 'Création...' : 'Create account'}
                </button>
            </form>
        </div>
    );
};

export default RegisterContent;
