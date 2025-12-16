import { useState, useEffect, createContext, useContext } from "react";

type FontSize = "small" | "medium" | "large";

interface FontSizeContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

export const FontSizeProvider = ({ children }: { children: React.ReactNode }) => {
  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    const stored = localStorage.getItem("dashboard-font-size");
    return (stored as FontSize) || "medium";
  });

  useEffect(() => {
    localStorage.setItem("dashboard-font-size", fontSize);
    
    // Apply font size class to body
    document.documentElement.classList.remove("font-small", "font-medium", "font-large");
    document.documentElement.classList.add(`font-${fontSize}`);
  }, [fontSize]);

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
  };

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize }}>
      {children}
    </FontSizeContext.Provider>
  );
};

export const useFontSize = () => {
  const context = useContext(FontSizeContext);
  if (!context) {
    throw new Error("useFontSize must be used within a FontSizeProvider");
  }
  return context;
};
