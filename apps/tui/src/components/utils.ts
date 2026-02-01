export function centerLines(width: number, text: string): string[] {
  const lines = text.split('\n');
  return lines.map((line) => {
    const lineWidth = line.length;
    const padding = Math.max(0, Math.floor((width - lineWidth) / 2));
    return ' '.repeat(padding) + line;
  });
}
