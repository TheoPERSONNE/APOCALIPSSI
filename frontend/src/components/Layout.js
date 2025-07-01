import React from 'react';
import './LayoutStyle.css';

const Layout = ({ children, onLogout, showHeader = false, showAvatar = false }) => {
    return (
        <div className="layout-app">
            {showAvatar && onLogout && (
                <div className="layout-user-avatar" onClick={onLogout}>
                    <div className="avatar-circle">👤</div>
                </div>
            )}

            <div className="layout-background">
                <div className="layout-container">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Layout;
