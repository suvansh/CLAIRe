import React, { useState } from 'react';

interface TooltipProps {
  content: string;
}

const Tooltip: React.FC<TooltipProps> = ({ content }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleTooltip = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="tooltip" onClick={toggleTooltip}>
      <span className="questionMark">?</span>
      {isOpen && <div className="tooltipText text-left">{content}</div>}
    </div>
  );
};

export default Tooltip;
