
import React from 'react';

interface RetroButtonProps {
  onClick: () => void;
  icon: string;
  title?: string;
  active?: boolean;
  className?: string;
}

const RetroButton: React.FC<RetroButtonProps> = ({ onClick, icon, title, active, className = "" }) => {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`
        flex items-center justify-center
        w-8 h-8 rounded-sm
        bg-[#333] border-t border-l border-gray-400 border-b border-r border-black
        hover:bg-[#444] active:bg-[#222] active:border-inset
        transition-colors duration-75
        ${active ? 'bg-[#555] shadow-inner text-green-400' : 'text-gray-300'}
        ${className}
      `}
    >
      <i className={icon}></i>
    </button>
  );
};

export default RetroButton;
