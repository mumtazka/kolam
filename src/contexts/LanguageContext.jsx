import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
    // Try to get language from localStorage, default to 'id' (Bahasa Indonesia)
    const [language, setLanguage] = useState(() => {
        const saved = localStorage.getItem('app_language');
        return saved === 'en' ? 'en' : 'id';
    });

    const changeLanguage = (lang) => {
        if (lang === 'id' || lang === 'en') {
            setLanguage(lang);
            localStorage.setItem('app_language', lang);
        }
    };

    /**
     * Translate a key using dot notation (e.g. 'auth.login')
     * Fallback to key if not found
     */
    const t = (key) => {
        const keys = key.split('.');
        let value = translations[language];

        for (const k of keys) {
            if (value && value[k]) {
                value = value[k];
            } else {
                console.warn(`Translation missing for key: ${key} in language: ${language}`);
                return key;
            }
        }

        return value;
    };

    const value = {
        language,
        changeLanguage,
        t
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};
