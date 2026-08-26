// EDITINGNOTE: Reviewed...

import * as React from 'react';

export const CircularBarPath = ({ className, arcPercentage, radius, strokeWidth }) => {
  const circumference = 2 * Math.PI * radius;
  const arcLength = (1 - arcPercentage) * circumference;

  return (
    <path
      className={className}
      style={{
        strokeDasharray: `${circumference} ${circumference}`,
        strokeDashoffset: arcLength,
      }}
      d={`M 50,50 m 0,-${radius} a ${radius},${radius} 0 1 1 0,${2 * radius} a ${radius},${radius} 0 1 1 0,-${2 * radius}`}
      strokeWidth={strokeWidth}
      fillOpacity={0}
    />
  );
};