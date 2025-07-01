import React, { useState } from 'react';
import Layout from './components/Layout';
import RegisterContent from './components/content/RegisterContent';
import LoginContent from './components/content/LoginContent';
import ConvertContent from './components/content/ConvertContent';
import UploadContent from './components/content/UploadContent';

function App() {
    const [currentPage, setCurrentPage] = useState('register');

    const handleNavigate = (page) => {
        setCurrentPage(page);
    };

    const handleLogin = () => {
        setCurrentPage('convert');
    };

    const handleLogout = () => {
        setCurrentPage('login');
    };

    const renderContent = () => {
        switch(currentPage) {
            case 'register':
                return <RegisterContent onNavigate={handleNavigate} />;
            case 'login':
                return <LoginContent onNavigate={handleNavigate} onLogin={handleLogin} />;
            case 'convert':
                return <ConvertContent onNavigate={handleNavigate} />;
            case 'upload':
                return <UploadContent onNavigate={handleNavigate} />;
            default:
                return <RegisterContent onNavigate={handleNavigate} />;
        }
    };

    const isMainPage = currentPage === 'convert' || currentPage === 'upload';

    return (
        <Layout
            showHeader={isMainPage}
            showAvatar={isMainPage}
            onLogout={handleLogout}
        >
            {renderContent()}
        </Layout>
    );
}

export default App;
