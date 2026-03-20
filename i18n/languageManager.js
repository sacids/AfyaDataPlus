// i18n/languageManager.js
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { config } from '../constants/config';
import i18n from './index';

// Import bundled language files directly
import en from '../assets/i18n/en.json';
import fr from '../assets/i18n/fr.json';
import ja from '../assets/i18n/ja.json';
import sw from '../assets/i18n/sw.json';

class LanguageManager {

  constructor() {
    // Bundled languages - imported directly
    this.bundledLanguages = {
      'en': en,
      'fr': fr,
      'sw': sw,
      'ja': ja
    };

    // Cache directory for downloaded languages
    this.cacheDir = `${LegacyFileSystem.cacheDirectory}i18n/`;

    //console.log('LanguageManager: Loaded', Object.keys(this.bundledLanguages).length, 'bundled languages');

    // Initialize directories and i18n
    this.initializeDirectories();
    this.initializeI18n();
  }

  // Initialize cache directory
  async initializeDirectories() {
    try {
      const dirInfo = await LegacyFileSystem.getInfoAsync(this.cacheDir);
      if (!dirInfo.exists) {
        await LegacyFileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
      }
    } catch (error) {
      console.error('Error initializing directories:', error);
    }
  }

  // Get language info from config section
  getLanguageInfoFromConfig(langCode, data) {
    if (data.config) {
      return {
        code: data.config.code || langCode,
        name: data.config.name || this.getLanguageName(langCode),
        nativeName: data.config.nativeName || data.config.name || this.getLanguageName(langCode),
        version: data.config.version || '1.0',
        isBundled: true
      };
    }

    // Fallback if config section is missing
    return {
      code: langCode,
      name: this.getLanguageName(langCode),
      nativeName: this.getLanguageName(langCode),
      version: '1.0',
      isBundled: true
    };
  }

  // Get all bundled languages with config info
  getBundledLanguages() {
    return Object.keys(this.bundledLanguages).map(code => {
      const data = this.bundledLanguages[code];
      return this.getLanguageInfoFromConfig(code, data);
    });
  }

  // Fetch ALL languages (bundled + downloaded)
  async fetchDownloadedLanguages() {
    const languages = [];

    try {
      // 1. Add all bundled languages (config read from bundled files)
      const bundled = this.getBundledLanguages();
      languages.push(...bundled);

      // 2. Scan cache for downloaded languages
      const dirInfo = await LegacyFileSystem.getInfoAsync(this.cacheDir);
      if (dirInfo.exists) {
        const files = await LegacyFileSystem.readDirectoryAsync(this.cacheDir);

        for (const fileName of files) {
          if (fileName.endsWith('.json')) {
            const langCode = fileName.replace('.json', '');

            // Skip if already in bundled (prefer bundled version)
            if (!this.bundledLanguages[langCode]) {
              const fileUri = `${this.cacheDir}${fileName}`;

              try {
                const content = await LegacyFileSystem.readAsStringAsync(fileUri);
                const jsonData = JSON.parse(content);

                // Read config from downloaded file
                const languageInfo = this.getLanguageInfoFromConfig(langCode, jsonData);
                languageInfo.isBundled = false;
                languages.push(languageInfo);

              } catch (error) {
                console.error(`Error reading ${fileName}:`, error);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching downloaded languages:', error);
    }

    return languages;
  }

  // Fetch available languages from server
  async fetchAvailableLanguages() {
    try {
      const response = await fetch(`${config.BASE_URL}/api/v1/languages/`);


      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      return data.languages || [];
    } catch (error) {
      console.error('Error fetching languages from server:', error);

      // Fallback: Return bundled languages
      return this.getBundledLanguages();
    }
  }

  // Download a language
  async downloadLanguage(langCode) {
    try {
      const url = `${config.BASE_URL}/api/v1/translations/${langCode}/`;


      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const translations = await response.json();

      // Save to cache
      const fileUri = `${this.cacheDir}${langCode}.json`;
      await LegacyFileSystem.writeAsStringAsync(fileUri, JSON.stringify(translations));

      // Load into i18n
      this.loadLanguageIntoI18n(langCode, translations);

      return translations;
    } catch (error) {
      console.error(`Error downloading ${langCode}:`, error);
      throw error;
    }
  }

  // Load translations into i18n
  loadLanguageIntoI18n(langCode, translations) {
    Object.keys(translations).forEach(namespace => {
      if (namespace !== 'config') {
        i18n.addResourceBundle(langCode, namespace, translations[namespace], true, true);
      }
    });
  }

  // Load a language (prefers cached, falls back to bundled)
  async loadLanguage(langCode) {
    try {
      let translations;

      // Check cache first
      const fileUri = `${this.cacheDir}${langCode}.json`;
      const cachedInfo = await LegacyFileSystem.getInfoAsync(fileUri);

      if (cachedInfo.exists) {
        // Load from cache (user-downloaded version)
        const content = await LegacyFileSystem.readAsStringAsync(fileUri);
        translations = JSON.parse(content);
      } else if (this.bundledLanguages[langCode]) {
        // Load from bundled (pre-installed version)
        translations = this.bundledLanguages[langCode];
      } else {
        throw new Error(`Language ${langCode} not found`);
      }

      // Load into i18n
      this.loadLanguageIntoI18n(langCode, translations);

      return translations;
    } catch (error) {
      console.error(`Error loading language ${langCode}:`, error);
      throw error;
    }
  }

  // Compare versions to check if update is needed
  compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  }

  // Initialize i18n with bundled languages
  async initializeI18n() {
    try {
      // Load all bundled languages into i18n
      Object.keys(this.bundledLanguages).forEach(langCode => {
        const translations = this.bundledLanguages[langCode];
        this.loadLanguageIntoI18n(langCode, translations);
      });

      //console.log(`Loaded ${Object.keys(this.bundledLanguages).length} bundled languages into i18n`);
    } catch (error) {
      console.error('Error initializing i18n:', error);
    }
  }

  // Remove a downloaded language
  async removeLanguage(langCode) {
    if (this.bundledLanguages[langCode]) {
      throw new Error('Cannot remove bundled language');
    }

    if (i18n.language === langCode) {
      throw new Error('Cannot remove currently active language');
    }

    const fileUri = `${this.cacheDir}${langCode}.json`;
    const fileInfo = await LegacyFileSystem.getInfoAsync(fileUri);

    if (fileInfo.exists) {
      await LegacyFileSystem.deleteAsync(fileUri);

      // Remove from i18n resources
      if (i18n.options.resources?.[langCode]) {
        Object.keys(i18n.options.resources[langCode]).forEach(namespace => {
          i18n.removeResourceBundle(langCode, namespace);
        });
      }
      return true;
    }
    return false;
  }

  // Check if language is downloaded
  async isLanguageDownloaded(langCode) {
    if (this.bundledLanguages[langCode]) {
      return true; // Bundled languages are always "downloaded"
    }

    const fileUri = `${this.cacheDir}${langCode}.json`;
    const fileInfo = await LegacyFileSystem.getInfoAsync(fileUri);
    return fileInfo.exists;
  }

  // Helper function for language names
  getLanguageName(langCode) {
    const names = {
      'en': 'English',
      'sw': 'Swahili',
      'fr': 'French',
      'ja': 'Japanese'
    };
    return names[langCode] || langCode.toUpperCase();
  }

  // Clear cache
  async clearCache() {
    try {
      if (await LegacyFileSystem.getInfoAsync(this.cacheDir)) {
        await LegacyFileSystem.deleteAsync(this.cacheDir, { idempotent: true });
        await this.initializeDirectories();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }

  // Get cache size
  async getCacheSize() {
    try {
      const dirInfo = await LegacyFileSystem.getInfoAsync(this.cacheDir);
      if (!dirInfo.exists) return 0;

      const files = await LegacyFileSystem.readDirectoryAsync(this.cacheDir);
      let totalSize = 0;

      for (const fileName of files) {
        const fileUri = `${this.cacheDir}${fileName}`;
        const fileInfo = await LegacyFileSystem.getInfoAsync(fileUri);
        if (fileInfo.exists) {
          totalSize += fileInfo.size || 0;
        }
      }

      return totalSize;
    } catch (error) {
      return 0;
    }
  }
}


const languageManagerInstance = new LanguageManager();
export default languageManagerInstance;