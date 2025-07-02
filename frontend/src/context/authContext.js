import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            apiService.setToken(token);
            // Tu peux ajouter ici une vérification du token
        }
        setLoading(false);
    }, []);

    const login = async (credentials) => {
        try {
            const response = await apiService.login(credentials);
            if (response.token) {
                apiService.setToken(response.token);
                setUser(response.user || { email: credentials.email });
                return { success: true };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const register = async (userData) => {
        try {
            const response = await apiService.register(userData);
            return { success: true, data: response };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const logout = () => {
        apiService.removeToken();
        setUser(null);
    };

    const value = {
        user,
        login,
        register,
        logout,
        loading,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
