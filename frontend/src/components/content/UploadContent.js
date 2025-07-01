import React, { useState } from 'react';
import './ContentStyles.css';

const UploadContent = () => {
    const [selectedFile, setSelectedFile] = useState(null);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        setSelectedFile(file);
        console.log('File selected:', file);
    };

    return (
        <div className="main-card">
            <h1>Upload your document</h1>

            <div className="upload-area">
                <input
                    type="file"
                    id="file-upload"
                    className="upload-input"
                    accept=".pdf,.doc,.docx,.txt,.jpg,.png"
                    onChange={handleFileChange}
                />
                <label htmlFor="file-upload" className="main-btn">
                    Upload
                </label>

                {selectedFile && (
                    <div className="upload-file-info">
                        <p>Selected: {selectedFile.name}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UploadContent;
