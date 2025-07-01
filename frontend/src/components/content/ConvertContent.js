import React from 'react';
import './ContentStyles.css';

const ConvertContent = ({ onNavigate }) => {
    return (
        <div className="main-card">
            <h1>Convert your document</h1>
            <p className="main-subtitle">
                Easy and fast. Convert now your document on PDF
            </p>
            <button
                className="main-btn"
                onClick={() => onNavigate('upload')}
            >
                Get Started
            </button>
        </div>
    );
};

export default ConvertContent;
