/**
 * S-Expression Parser for KiCad files
 * Parses the Lisp-like format used by KiCad for .kicad_pcb and .kicad_sch files
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
    while (this.pos < this.length && /\s/.test(this.text[this.pos])) {
      this.pos++;
    }
  }

  private parseExpr(): SExpr | null {
    this.skipWhitespace();

    if (this.pos >= this.length) {
      return null;
    }

    if (this.text[this.pos] === "(") {
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
        throw new Error("Unexpected end of file - unclosed list");
      }

      if (this.text[this.pos] === ")") {
        this.pos++; // Skip ')'
        return result;
      }

      const expr = this.parseExpr();
      if (expr !== null) {
        result.push(expr);
      }
    }

    throw new Error("Unclosed list");
  }

  private parseAtom(): string | number {
    this.skipWhitespace();

    if (this.pos >= this.length) {
      return "";
    }

    // Handle quoted strings
    if (this.text[this.pos] === '"') {
      return this.parseQuotedString();
    }

    // Parse unquoted atom
    const start = this.pos;
    while (
      this.pos < this.length &&
      !/\s/.test(this.text[this.pos]) &&
      this.text[this.pos] !== "(" &&
      this.text[this.pos] !== ")"
    ) {
      this.pos++;
    }

    const atom = this.text.slice(start, this.pos);

    // Try to parse as number
    if (atom.includes(".")) {
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
        return result.join("");
      } else if (char === "\\" && this.pos + 1 < this.length) {
        this.pos++;
        result.push(this.text[this.pos]);
        this.pos++;
      } else {
        result.push(char);
        this.pos++;
      }
    }

    throw new Error("Unclosed quoted string");
  }
}

// Helper functions for working with S-expressions

/**
 * Find all elements with a given tag name in an S-expression tree
 */
export function findElements(sexpr: SExpr, tag: string): SExpr[][] {
  const results: SExpr[][] = [];

  if (Array.isArray(sexpr) && sexpr.length > 0) {
    if (sexpr[0] === tag) {
      results.push(sexpr);
    }
    for (const item of sexpr) {
      if (Array.isArray(item)) {
        results.push(...findElements(item, tag));
      }
    }
  }

  return results;
}

/**
 * Get a simple value from an S-expression like (name value)
 */
export function getValue(sexpr: SExpr[], tag: string): SExpr | undefined {
  for (const item of sexpr) {
    if (Array.isArray(item) && item.length >= 2 && item[0] === tag) {
      return item[1];
    }
  }
  return undefined;
}

/**
 * Get property value from a symbol/footprint definition
 */
export function getProperty(sexpr: SExpr[], name: string): string | undefined {
  for (const item of sexpr) {
    if (
      Array.isArray(item) &&
      item.length >= 3 &&
      item[0] === "property" &&
      item[1] === name
    ) {
      return String(item[2]);
    }
  }
  return undefined;
}

/**
 * Extract x, y coordinates from an 'at' element
 */
export function getXY(sexpr: SExpr[]): { x: number; y: number; rotation?: number } {
  for (const item of sexpr) {
    if (Array.isArray(item) && item[0] === "at" && item.length >= 3) {
      return {
        x: Number(item[1]) || 0,
        y: Number(item[2]) || 0,
        rotation: item.length > 3 ? Number(item[3]) : undefined,
      };
    }
  }
  return { x: 0, y: 0 };
}
