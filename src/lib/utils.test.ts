import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges class names and resolves tailwind conflicts', () => {
    const result = cn('p-2', 'p-4', ['text-sm', false && 'hidden'], { 'font-bold': true });
    expect(result).toContain('p-4');
    expect(result).toContain('text-sm');
    expect(result).toContain('font-bold');
    expect(result).not.toContain('p-2');
  });
});
