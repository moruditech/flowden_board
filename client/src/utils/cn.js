// Minimal classname merger — avoids installing clsx + tailwind-merge for now
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
