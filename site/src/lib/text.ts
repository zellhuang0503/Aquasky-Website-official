// 內容檔用的兩個小記號：**粗體**（舊站 <strong>）與 \n 換行（舊站 <br>）。其餘字元先逃脫，輸出才安全。
const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** "a **b** c" → "a <strong>b</strong> c" */
export function bold(s: string): string {
  return escape(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

/** "a\nb" → "a<br>b" */
export function br(s: string): string {
  return escape(s).replace(/\n/g, '<br>');
}
