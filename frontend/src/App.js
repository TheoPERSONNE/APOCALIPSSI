import React, { useState } from 'react';
import { AuthProvider } from './context/authContext';
import Layout from './components/Layout';
import RegisterContent from './components/content/RegisterContent';
import LoginContent from './components/content/LoginContent';
import ConvertContent from './components/content/ConvertContent';
import UploadContent from './components/content/UploadContent';
import ResumeView from './pages/ResumeView';

function App() {
    const [currentPage, setCurrentPage] = useState('register');
    const [currentDocumentId, setCurrentDocumentId] = useState(null); // ✅ Ajout

    const handleNavigate = (page, documentId = null) => {
        setCurrentPage(page);
        if (documentId) {
            setCurrentDocumentId(documentId); // ✅ Stocker l'ID du document
        }
    };

    const handleLogin = () => {
        setCurrentPage('convert');
    };

    const handleLogout = () => {
        setCurrentPage('login');
        setCurrentDocumentId(null); // ✅ Reset
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
            case 'resume': // ✅ Nouvelle page
                return <ResumeView documentId={currentDocumentId} onNavigate={handleNavigate} />;
            default:
                return <RegisterContent onNavigate={handleNavigate} />;
        }
    };

    const isMainPage = currentPage === 'convert' || currentPage === 'upload' || currentPage === 'resume'; // ✅ Ajout resume

    return (
        <AuthProvider>
            <Layout
                showHeader={isMainPage}
                showAvatar={isMainPage}
                onLogout={handleLogout}
            >
                {renderContent()}
            </Layout>
        </AuthProvider>
    );
}

export default App;
