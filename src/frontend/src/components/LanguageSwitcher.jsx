import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { languages } from '../i18n';

const LanguageSwitcher = ({ onLanguageChange }) => {
  const { i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language || 'en');

  useEffect(() => {
    setCurrentLang(i18n.language);
  }, [i18n.language]);

  const handleChange = (e) => {
    const newLang = e.target.value;
    setCurrentLang(newLang);
    i18n.changeLanguage(newLang);
    if (onLanguageChange) {
      onLanguageChange(newLang);
    }
  };

  return (
    <div className="language-switcher">
      <select value={currentLang} onChange={handleChange} className="language-select">
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSwitcher;
