const API_BASE_URL = 'http://localhost:5000/api';

class ApiService {
    constructor() {
        this.token = localStorage.getItem('token');
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    removeToken() {
        this.token = null;
        localStorage.removeItem('token');
    }

    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            ...options,
        };

        console.log('🔍 API Request - URL:', url);
        console.log('🔍 API Request - Method:', config.method);
        console.log('🔍 API Request - Body type:', typeof config.body);
        console.log('🔍 API Request - Body instanceof FormData:', config.body instanceof FormData);

        // ✅ Gestion correcte pour FormData
        if (config.body instanceof FormData) {
            console.log('🔍 FormData detected - NO custom headers');
            // ❌ NE PAS toucher aux headers pour FormData
            config.headers = {
                ...options.headers, // Seulement les headers passés (comme Authorization)
                // ❌ PAS de Content-Type ici !
            };

            // Log FormData content
            for (let [key, value] of config.body.entries()) {
                console.log('🔍 FormData entry:', key, '=', value);
            }
        } else {
            // ✅ JSON seulement pour non-FormData
            config.headers = {
                'Content-Type': 'application/json',
                ...options.headers,
            };
        }

        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        console.log('🔍 Final headers:', config.headers);

        try {
            const response = await fetch(url, config);
            console.log('🔍 Response status:', response.status);
            console.log('🔍 Response headers:', response.headers);

            if (!response.ok) {
                const errorText = await response.text();
                console.log('❌ Error response:', errorText);
                throw new Error(`Erreur ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('✅ Success response:', result);
            return result;
        } catch (error) {
            console.error('❌ Request failed:', error);
            throw error;
        }
    }

    // Authentification - ROUTES CORRIGÉES
    async register(userData) {
        return this.request('/users/register', {  // ✅ Changé de /auth/register
            method: 'POST',
            body: JSON.stringify(userData),
        });
    }

    async login(credentials) {
        return this.request('/users/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
    }

    async getUserDocuments() {
        return this.request('/documents');
    }

    async deleteDocument(documentId) {
        return this.request(`/documents/${documentId}`, {
            method: 'DELETE',
        });
    }

    // Profil utilisateur
    async getProfile() {
        return this.request('/users/profile');
    }

    async updateProfile(profileData) {
        return this.request('/users/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData),
        });
    }

    async uploadDocument(formData) {
        const response = await fetch(`${API_BASE_URL}/documents/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erreur upload');
        }

        return response.json();
    }

    async generateResume(documentId) {
        const response = await fetch(`${API_BASE_URL}/resumes/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify({documentId})
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erreur génération résumé');
        }

        return response.json();
    }

    async getResumeByDocument(documentId) {
        const response = await fetch(`${API_BASE_URL}/resumes/document/${documentId}`, {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erreur récupération résumé');
        }

        return response.json();
    }

}

export default new ApiService();
