import { motion } from "framer-motion";

const colorMap = {
  red: '#FF0055',
  blue: '#00FFFF',
  green: '#CCFF00',
  yellow: '#FFAA00',
  wild: 'white'
};

const colorNames = {
  red: 'Red',
  blue: 'Blue',
  green: 'Green',
  yellow: 'Yellow',
  wild: 'Wild'
};

function UnoCard({ card, size = "medium", onClick }) {
  const sizeClasses = {
    small: "w-20 h-28",
    medium: "w-24 h-36 md:w-28 md:h-42",
    large: "w-32 h-48 md:w-40 md:h-60"
  };

  const numberSizes = {
    small: "text-xl",
    medium: "text-2xl md:text-3xl",
    large: "text-4xl md:text-5xl"
  };

  const bgColor = colorMap[card.color] || '#FFF';
  const isWild = card.color === 'wild';

  const getCardDisplay = () => {
    if (card.value === 'wild' || card.value === 'wild4') {
      return card.value === 'wild4' ? '+4' : 'W';
    }
    if (card.value === 'skip') return '⊘';
    if (card.value === 'reverse') return '⇄';
    if (card.value === 'draw2') return '+2';
    return card.value;
  };

  return (
    <motion.div
      onClick={onClick}
      className={`relative ${sizeClasses[size]} rounded-xl border shadow-2xl transition-all backdrop-blur-sm overflow-hidden`}
      style={{
        borderColor: isWild ? 'white' : `${bgColor}40`,
        background: isWild 
          ? 'linear-gradient(135deg, #FF0055 0%, #00FFFF 25%, #CCFF00 50%, #FFAA00 75%, #FF0055 100%)'
          : 'linear-gradient(to bottom, #000 0%, #111 100%)',
      }}
    >
      {/* Inner glow */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: isWild
            ? 'transparent'
            : `linear-gradient(135deg, ${bgColor} 0%, transparent 70%)`
        }}
      />

      {/* Card border accent */}
      <div
        className="absolute inset-0 rounded-xl"
        style={{
          boxShadow: `inset 0 0 20px ${isWild ? 'rgba(255,255,255,0.3)' : `${bgColor}40`}`
        }}
      />

      {/* Top number/symbol */}
      <div
        className={`absolute top-1 left-1 ${numberSizes[size]} font-numbers font-bold z-10`}
        style={{ color: isWild ? '#000' : bgColor }}
      >
        {getCardDisplay()}
      </div>

      {/* Center number/symbol */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div
          className={`${size === 'large' ? 'text-6xl md:text-8xl' : size === 'medium' ? 'text-4xl md:text-5xl' : 'text-3xl'} font-numbers font-bold`}
          style={{ color: isWild ? '#000' : bgColor }}
        >
          {getCardDisplay()}
        </div>
      </div>

      {/* Bottom number/symbol (rotated) */}
      <div
        className={`absolute bottom-1 right-1 ${numberSizes[size]} font-numbers font-bold z-10 rotate-180`}
        style={{ color: isWild ? '#000' : bgColor }}
      >
        {getCardDisplay()}
      </div>

      {/* Color name for wild cards */}
      {isWild && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs font-bold text-black uppercase tracking-wider">
          {card.value === 'wild4' ? 'Wild +4' : 'Wild'}
        </div>
      )}
    </motion.div>
  );
}

export default UnoCard;
