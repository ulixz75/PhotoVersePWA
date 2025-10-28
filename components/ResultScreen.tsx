import React, { useState, useEffect } from 'react';
import ClayButton from './ClayButton';
import { Copy, RefreshCw, Download, Share2 } from 'lucide-react';
import { Poem, Language } from '../types';
import { t } from '../translations';


declare global {
  interface Window {
    jspdf: any;
  }
}

interface ResultScreenProps {
  poem: Poem | null;
  image?: string | null;
  onReset: () => void;
  authorName?: string;
  language: Language;
}

const useTypewriter = (text: string | null, speed: number = 50): string => {
    const [displayText, setDisplayText] = useState('');

    useEffect(() => {
        if (!text) {
            setDisplayText('');
            return;
        }
        
        setDisplayText('');
        let timeoutId: number;

        const typeCharacter = (index: number) => {
            if (index >= text.length) {
                return; 
            }
            setDisplayText(prev => text.substring(0, index + 1));
            timeoutId = window.setTimeout(() => typeCharacter(index + 1), speed);
        };
        
        const startTimeoutId = window.setTimeout(() => typeCharacter(0), 10);

        return () => {
            window.clearTimeout(timeoutId);
            window.clearTimeout(startTimeoutId);
        };
    }, [text, speed]);

    return displayText;
};


const ResultScreen: React.FC<ResultScreenProps> = ({ poem, image, onReset, authorName, language }) => {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [shared, setShared] = useState(false);
  
  const displayedPoem = useTypewriter(poem?.poem || t.poemError[language], 50);
  const isFinishedTyping = poem?.poem === displayedPoem;

  const getFullPoemText = () => {
      if (!poem) return '';
      const authorLine = authorName ? `\n\n- ${authorName}` : '';
      return `${poem.title}\n\n${poem.poem}${authorLine}`;
  }

  const handleCopy = () => {
    if (poem) {
      navigator.clipboard.writeText(getFullPoemText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share && poem) {
      try {
        await navigator.share({
          title: poem.title,
          text: getFullPoemText(),
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      handleCopy();
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };
  
  const loadImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = url;
    });

  const handleDownloadPdf = async () => {
    if (!poem || !image) return;
    setIsDownloading(true);

    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;

      // --- PÁGINA 1: Imagen y Marco ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("Photo Verse", pageWidth / 2, 25, { align: "center" });
      
      const img = await loadImage(image);
      const availableWidth = pageWidth - margin * 2;
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      let imgWidth = availableWidth;
      let imgHeight = imgWidth / aspectRatio;

      if (imgHeight > pageHeight * 0.7) {
        imgHeight = pageHeight * 0.7;
        imgWidth = imgHeight * aspectRatio;
      }

      const imgX = (pageWidth - imgWidth) / 2;
      const imgY = 40;

      // --- Inicio: Código del Marco Elegante ---
      const framePadding = 4; // 4mm de padding
      
      // Marco exterior oscuro (simula un paspartú)
      doc.setFillColor(15, 118, 110); // 'shadow-dark' (#0F766E)
      doc.rect(
        imgX - framePadding, 
        imgY - framePadding, 
        imgWidth + framePadding * 2, 
        imgHeight + framePadding * 2, 
        'F'
      );

      // Borde interior claro para un toque de luz
      const innerBorderOffset = 0.5;
      doc.setDrawColor(94, 234, 212); // 'shadow-light' (#5EEAD4)
      doc.setLineWidth(0.5);
      doc.rect(
          imgX - framePadding + innerBorderOffset,
          imgY - framePadding + innerBorderOffset,
          imgWidth + (framePadding - innerBorderOffset) * 2,
          imgHeight + (framePadding - innerBorderOffset) * 2,
          'S'
      );
      // --- Fin: Código del Marco Elegante ---

      doc.addImage(img, 'JPEG', imgX, imgY, imgWidth, imgHeight);
      
      // --- PÁGINA 2: Poema ---
      doc.addPage();
      
      doc.setFillColor(240, 253, 250); // Tono 'surface' (#F0FDFA)
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      doc.setDrawColor(15, 118, 110); // Tono 'shadow-dark' (#0F766E)
      doc.setLineWidth(0.5);
      doc.rect(margin / 2, margin / 2, pageWidth - margin, pageHeight - margin, 'S');

      doc.setTextColor(31, 41, 55); // Tono 'text-dark' (#1F2937)
      const textAvailableWidth = pageWidth - margin * 2;

      // Title
      doc.setFont("times", "bold");
      doc.setFontSize(18);
      const splitTitle = doc.splitTextToSize(poem.title, textAvailableWidth);
      const titleHeight = doc.getTextDimensions(splitTitle).h;

      // Poem
      doc.setFont("times", "normal");
      doc.setFontSize(14);
      const splitPoem = doc.splitTextToSize(poem.poem, textAvailableWidth);
      const poemHeight = doc.getTextDimensions(splitPoem, {lineHeightFactor: 1.6}).h;
      
      const totalHeight = titleHeight + poemHeight + 10;
      const startY = (pageHeight - totalHeight) / 2;

      doc.setFont("times", "bold");
      doc.setFontSize(18);
      doc.text(splitTitle, pageWidth / 2, startY, { align: "center" });
      
      doc.setFont("times", "normal");
      doc.setFontSize(14);
      doc.text(splitPoem, pageWidth / 2, startY + titleHeight + 10, { align: "center", lineHeightFactor: 1.6 });
      
      if (authorName) {
        const poemEndY = startY + titleHeight + 10 + poemHeight;
        doc.setFont("times", "italic");
        doc.setFontSize(12);
        doc.text(`- ${authorName}`, textAvailableWidth + margin -5, poemEndY + 15, { align: "right" });
      }

      doc.save(`${poem.title.replace(/\s/g, '_') || 'poem'}-photo-verse.pdf`);
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("No se pudo generar el PDF. Por favor, inténtalo de nuevo.");
    } finally {
      setIsDownloading(false);
    }
  };


  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-main-teal overflow-hidden">
      <div className="md:w-1/2 w-full h-64 md:h-auto flex-shrink-0">
        {image && <img src={image} alt="Inspiración" className="w-full h-full object-cover" />}
      </div>
      
      <div className="md:w-1/2 w-full flex flex-col flex-1">
         <header className="p-6 text-center border-b border-shadow-dark flex-shrink-0">
           <h1 className="text-3xl font-bold text-surface min-h-[40px]">{poem?.title || `${t.generatingTitle[language]}...`}</h1>
        </header>

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <div className="whitespace-pre-wrap text-surface font-sans text-lg leading-relaxed">
            {displayedPoem}
            {!isFinishedTyping && <span className="inline-block w-0.5 h-5 bg-surface/70 animate-ping ml-1"></span>}
          </div>
          {isFinishedTyping && authorName && (
            <p className="text-right mt-6 italic text-surface/80">- {authorName}</p>
          )}
        </main>

        <footer className="p-6 md:p-8 bg-main-teal/80 backdrop-blur-sm border-t border-shadow-dark flex flex-wrap items-center justify-center gap-4 mt-auto">
          <ClayButton onClick={handleShare} color="secondary" fullWidth={false} className="flex-1 min-w-[140px]" disabled={!isFinishedTyping}>
            <Share2 className="mr-2" size={20} /> {shared ? t.copied[language] : t.share[language]}
          </ClayButton>
          <ClayButton onClick={handleCopy} color="secondary" fullWidth={false} className="flex-1 min-w-[140px]" disabled={!isFinishedTyping}>
            <Copy className="mr-2" size={20} /> {copied ? t.copied[language] : t.copy[language]}
          </ClayButton>
          <ClayButton onClick={handleDownloadPdf} color="accent" fullWidth={false} className="flex-1 min-w-[140px]" disabled={isDownloading || !isFinishedTyping}>
            <Download className="mr-2" size={20} /> {isDownloading ? t.generating[language] : t.download[language]}
          </ClayButton>
          <ClayButton onClick={onReset} fullWidth={false} className="flex-1 min-w-[140px]">
            <RefreshCw className="mr-2" size={20} /> {t.createAnother[language]}
          </ClayButton>
        </footer>
      </div>
    </div>
  );
};

export default ResultScreen;