import { describe, expect, it } from 'vitest';
import { encode, decode, channel, intact } from './dna';

describe('DNA input fidelity', () => {
  it('round-trips clean ASCII, accented, Chinese and emoji messages', () => {
    for (const text of ['A', 'café', 'Ł', '香港🦉', '🧬 DNA', '']) {
      expect(decode(encode(text))).toBe(text);
      expect(intact(text, decode(encode(text)))).toBe([...text].length);
      expect(encode(text)).toMatch(/^[ACGT]*$/);
      expect(encode(text).length).toBe(new TextEncoder().encode(text).length * 4);
    }
    expect(encode('Ł')).not.toBe(encode('A'));
  });
  it('does not create a strand for an empty input or delete missing bases', () => {
    expect(channel('', 42, 2, 2, 2)).toEqual({ out: '', events: [] });
    const destroyed = channel('AC', 42, 0, 0, 8);
    expect(destroyed.out).toBe('');
    expect(destroyed.events).toHaveLength(2);
    expect(decode('ACG')).toBe('');
  });
  it('retains reproducible seeded damage and code-point accounting', () => {
    const input = encode('data in DNA');
    const first = channel(input, 31, 2, 1, 1);
    expect(channel(input, 31, 2, 1, 1)).toEqual(first);
    expect(first.out.length).toBe(input.length);
    expect(first.events).toHaveLength(4);
    expect(intact('🦉A', '🦉B')).toBe(1);
  });
});
