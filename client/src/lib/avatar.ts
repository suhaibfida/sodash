// Generate random avatar colors and data
const colors = [
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#45B7D1", // Blue
  "#FFA07A", // Light Salmon
  "#98D8C8", // Mint
  "#F7DC6F", // Yellow
  "#BB8FCE", // Purple
  "#85C1E2", // Sky Blue
  "#F8B88B", // Peach
  "#B8E6D5", // Light Green
  "#FFB6C1", // Light Pink
  "#87CEEB", // Sky Blue
  "#DDA0DD", // Plum
  "#F0E68C", // Khaki
];

export const getAvatarColor = (address: string): string => {
  // Use address hash to consistently generate same color for same address
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    const char = address.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return colors[Math.abs(hash) % colors.length];
};

export const generateAvatarUrl = (address: string): string => {
  const color = getAvatarColor(address);
  const initials = address.slice(0, 2).toUpperCase();
  
  // Create SVG avatar with gradient and glow
  const svg = `
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${adjustBrightness(color, -30)};stop-opacity:1" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#grad)" filter="url(#glow)" opacity="0.95"/>
      <circle cx="50" cy="50" r="48" fill="none" stroke="white" stroke-width="1.5" opacity="0.3"/>
      <circle cx="35" cy="35" r="8" fill="white" opacity="0.25" />
      <text x="50" y="58" font-size="42" font-weight="900" fill="white" text-anchor="middle" font-family="Arial" opacity="0.95">
        ${initials}
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

const adjustBrightness = (color: string, amount: number): string => {
  const usePound = color[0] === "#";
  const col = usePound ? color.slice(1) : color;
  const num = parseInt(col, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  return (usePound ? "#" : "") + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

export const getRandomColor = (): string => {
  return colors[Math.floor(Math.random() * colors.length)];
};
