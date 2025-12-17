/**
 * S-Expression Parser for KiCad files
 * Browser-compatible version
 */

export type SExpr = string | number | SExpr[];

export class SExprParser {
  private text: string;
  private pos: number;
  private length: number;

  constructor(text: string) {
    this.text = text;
    this.pos = 0;
    this.length = text.length;
  }

  parse(): SExpr | null {
    return this.parseExpr();
  }

  private skipWhitespace(): void {
    while (this.pos < this.length && /\s/.test(this.text[this.pos]!)) {
      this.pos++;
    }
  }

  private parseExpr(): SExpr | null {
    this.skipWhitespace();

    if (this.pos >= this.length) {
      return null;
    }

    if (this.text[this.pos] === '(') {
      return this.parseList();
    } else {
      return this.parseAtom();
    }
  }

  private parseList(): SExpr[] {
    this.pos++; // Skip '('
    const result: SExpr[] = [];

    while (this.pos < this.length) {
      this.skipWhitespace();

      if (this.pos >= this.length) {
        throw new Error('Unexpected end of file - unclosed list');
      }

      if (this.text[this.pos] === ')') {
        this.pos++; // Skip ')'
        return result;
      }

      const expr = this.parseExpr();
      if (expr !== null) {
        result.push(expr);
      }
    }

    throw new Error('Unclosed list');
  }

  private parseAtom(): string | number {
    this.skipWhitespace();

    if (this.pos >= this.length) {
      return '';
    }

    // Handle quoted strings
    if (this.text[this.pos] === '"') {
      return this.parseQuotedString();
    }

    // Parse unquoted atom
    const start = this.pos;
    while (
      this.pos < this.length &&
      !/\s/.test(this.text[this.pos]!) &&
      this.text[this.pos] !== '(' &&
      this.text[this.pos] !== ')'
    ) {
      this.pos++;
    }

    const atom = this.text.slice(start, this.pos);

    // Try to parse as number
    if (atom.includes('.')) {
      const num = parseFloat(atom);
      if (!isNaN(num)) return num;
    } else {
      const num = parseInt(atom, 10);
      if (!isNaN(num)) return num;
    }

    return atom;
  }

  private parseQuotedString(): string {
    this.pos++; // Skip opening quote
    const result: string[] = [];

    while (this.pos < this.length) {
      const char = this.text[this.pos];

      if (char === '"') {
        this.pos++; // Skip closing quote
        return result.join('');
      } else if (char === '\\' && this.pos + 1 < this.length) {
        this.pos++;
        result.push(this.text[this.pos]!);
        this.pos++;
      } else {
        result.push(char!);
        this.pos++;
      }
    }

    throw new Error('Unclosed quoted string');
  }
}
