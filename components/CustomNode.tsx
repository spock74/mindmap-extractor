import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NODE_TYPE_COLORS, NODE_WIDTH } from '../constants';

export const CustomNode: React.FC<NodeProps> = memo(({ data }) => {
  const isHorizontal = data.layoutDirection === 'LR' || data.layoutDirection === 'RL';
  const targetPosition = isHorizontal ? Position.Left : Position.Top;
  const sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

  const colorClass = NODE_TYPE_COLORS[data.type] || NODE_TYPE_COLORS.default;
  return (
    <>
      <Handle type="target" position={targetPosition} className="!bg-gray-500" />
      <div
        className={`px-4 py-2 shadow-md rounded-md border-2 text-white ${colorClass} whitespace-normal break-words`}
        style={{ width: `${NODE_WIDTH}px` }}
      >
        <div className="flex flex-col">
          <div className="text-xs font-bold capitalize text-gray-300">{data.type}</div>
          <div className="text-sm font-medium mt-1">{data.label}</div>
        </div>
      </div>
      <Handle type="source" position={sourcePosition} className="!bg-gray-500" />
    </>
  );
});