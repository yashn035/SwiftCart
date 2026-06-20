import { createContext, useContext, useState } from 'react';

const LanguageContext = createContext();

const translations = {
  en: {
    shop: 'Shop',
    compare: 'Compare',
    support: 'Support',
    dashboard: 'Dashboard',
    admin: 'Admin',
    myOrders: 'My Orders',
    signIn: 'Sign In',
    getStarted: 'Get Started',
    signOut: 'Sign Out',
    myWallet: 'My Wallet',
    chat: 'Live Chat',
    searchPlaceholder: 'Search products...'
  },
  hi: {
    shop: 'दुकान',
    compare: 'तुलना करें',
    support: 'सहायता',
    dashboard: 'डैशबोर्ड',
    admin: 'प्रशासक',
    myOrders: 'मेरे ऑर्डर्स',
    signIn: 'लॉग इन',
    getStarted: 'शुरू करें',
    signOut: 'लॉग आउट',
    myWallet: 'मेरा बटुआ',
    chat: 'लाइव चैट',
    searchPlaceholder: 'उत्पाद खोजें...'
  },
  mr: {
    shop: 'खरेदी',
    compare: 'तुलना करा',
    support: 'मदत',
    dashboard: 'डॅशबोर्ड',
    admin: 'प्रशासक',
    myOrders: 'माझ्या ऑर्डर्स',
    signIn: 'साइन इन',
    getStarted: 'सुरू करा',
    signOut: 'लॉग आउट',
    myWallet: 'माझे वॉलेट',
    chat: 'लाइव्ह चॅट',
    searchPlaceholder: 'उत्पादने शोधा...'
  }
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en');

  const t = (key) => {
    return translations[lang][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
