/**
 * Компонент выбора языка для Telegram Mini App
 * 
 * Позволяет пользователю переключать язык интерфейса
 * и сохраняет выбор в localStorage и Telegram Cloud Storage
 */

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages } from 'lucide-react';
import { SafeTelegramAPI } from '../../services/telegramErrorService';

interface Language {
  code: string;
  name: string;
  flag: string;
}

const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
];

interface LanguageSelectorProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'outline',
  size = 'default',
  className = ''
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(
    SUPPORTED_LANGUAGES[0] // Default to Russian
  );

  useEffect(() => {
    // Load saved language preference
    const loadLanguage = async () => {
      try {
        // Try to get from Telegram Cloud Storage first
        const cloudData = await SafeTelegramAPI.getCloudStorage(['language']);
        if (cloudData && cloudData.language) {
          const lang = SUPPORTED_LANGUAGES.find(l => l.code === cloudData.language);
          if (lang) {
            setSelectedLanguage(lang);
            return;
          }
        }

        // Fallback to localStorage
        const savedLang = localStorage.getItem('unifarm_language');
        if (savedLang) {
          const lang = SUPPORTED_LANGUAGES.find(l => l.code === savedLang);
          if (lang) {
            setSelectedLanguage(lang);
          }
        }
      } catch (error) {
        console.error('[LANGUAGE SELECTOR] Error loading language preference:', error);
      }
    };

    loadLanguage();
  }, []);

  const handleLanguageChange = async (language: Language) => {
    try {
      console.log('[LANGUAGE SELECTOR] 🌐 Changing language to:', language.code);
      
      // Update state
      setSelectedLanguage(language);
      
      // Save to localStorage
      localStorage.setItem('unifarm_language', language.code);
      
      // Try to save to Telegram Cloud Storage
      const saved = await SafeTelegramAPI.setCloudStorage({
        language: language.code
      });
      
      if (saved) {
        console.log('[LANGUAGE SELECTOR] ✅ Language saved to cloud storage');
      }
      
      // Emit custom event for other components to react
      const event = new CustomEvent('languageChanged', {
        detail: { language: language.code }
      });
      window.dispatchEvent(event);
      
      // Show notification
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert(`Язык изменен на ${language.name}`);
      }
      
    } catch (error) {
      console.error('[LANGUAGE SELECTOR] Error changing language:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Languages className="h-4 w-4 mr-2" />
          {selectedLanguage.flag} {selectedLanguage.code.toUpperCase()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {SUPPORTED_LANGUAGES.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language)}
            className={selectedLanguage.code === language.code ? 'bg-accent' : ''}
          >
            <span className="mr-2">{language.flag}</span>
            {language.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;