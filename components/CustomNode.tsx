import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NODE_TYPE_COLORS, NODE_WIDTH } from '../constants';

// SVG for Copy Icon
const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

// SVG for Check Icon (to show after copying)
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

// SVG for Chevron Icon
const ChevronIcon = ({ isCollapsed }: { isCollapsed: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    className={`transition-transform duration-200 ${isCollapsed ? 'transform -rotate-90' : ''}`}
    aria-hidden="true"
  >
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);


export const CustomNode: React.FC<NodeProps> = memo(({ id, data }) => {
  const [isCopied, setIsCopied] = useState(false);

  const isHorizontal = data.layoutDirection === 'LR' || data.layoutDirection === 'RL';
  const targetPosition = isHorizontal ? Position.Left : Position.Top;
  const sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

  const colorClass = NODE_TYPE_COLORS[data.type] || NODE_TYPE_COLORS.default;
  
  const chevronPositionClass = isHorizontal
    ? 'top-1/2 -translate-y-1/2 -right-3' // For LR/RL layouts
    : '-bottom-3 left-1/2 -translate-x-1/2'; // For TB/BT layouts

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = `Label: ${data.label}\nType: ${data.type}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000); // Reset after 2 seconds
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onToggle) {
      data.onToggle(id);
    }
  };


  return (
    <>
      <Handle type="target" position={targetPosition} className="!bg-gray-500" />
      <div
        className={`relative px-4 py-2 shadow-md rounded-md border-2 text-white ${colorClass} whitespace-normal break-words`}
        style={{ width: `${NODE_WIDTH}px` }}
      >
        {data.hasChildren && (
            <button
                onClick={handleToggle}
                className={`absolute z-10 p-0.5 bg-gray-600 rounded-full cursor-pointer text-gray-300 hover:text-white hover:bg-gray-500 transition-colors ${chevronPositionClass}`}
                aria-label={data.isCollapsed ? "Expand" : "Collapse"}
                title={data.isCollapsed ? "Expand" : "Collapse"}
            >
               <ChevronIcon isCollapsed={data.isCollapsed} />
            </button>
        )}
         <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1 rounded-full cursor-pointer text-gray-400 hover:text-white hover:bg-black/20 transition-colors"
          aria-label={isCopied ? "Copied" : "Copy node data"}
          title={isCopied ? "Copied!" : "Copy node data"}
        >
          {isCopied ? <CheckIcon /> : <CopyIcon />}
        </button>
        <div className="flex flex-col">
          <div className="text-xs font-bold capitalize text-gray-300 pr-6">{data.type}</div>
          <div className="text-sm font-medium mt-1">{data.label}</div>
        </div>
      </div>
      <Handle type="source" position={sourcePosition} className="!bg-gray-500" />
    </>
  );
});