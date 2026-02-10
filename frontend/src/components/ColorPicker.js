import { motion } from "framer-motion";
import { X } from "lucide-react";

const colors = [
  { name: 'red', hex: '#FF0055', label: 'Red' },
  { name: 'blue', hex: '#00FFFF', label: 'Blue' },
  { name: 'green', hex: '#CCFF00', label: 'Green' },
  { name: 'yellow', hex: '#FFAA00', label: 'Yellow' }
];

function ColorPicker({ onSelectColor, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="color-picker-modal"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="backdrop-blur-xl bg-white/10 border-2 border-white/20 rounded-3xl p-8 max-w-md w-full"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-headings text-2xl font-bold text-white uppercase">
            Choose Color
          </h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
            data-testid="close-color-picker"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {colors.map((color) => (
            <motion.button
              key={color.name}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelectColor(color.name)}
              className="aspect-square rounded-2xl border-4 border-white/20 font-bold text-2xl uppercase font-headings transition-all hover:border-white/40"
              style={{
                background: color.hex,
                color: color.name === 'yellow' || color.name === 'green' ? '#000' : '#FFF',
                boxShadow: `0 0 30px ${color.hex}80`
              }}
              data-testid={`color-choice-${color.name}`}
            >
              {color.label}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default ColorPicker;
