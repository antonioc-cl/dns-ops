/**
 * SMTP STARTTLS Probe Tests
 *
 * SEC-004: Tests for multiline EHLO response parsing
 * Note: These tests verify the logic by testing the response line matching,
 * not the full probe which requires complex socket mocking.
 */

import { describe, expect, it } from 'vitest';

describe('SMTP STARTTLS Probe', () => {
  describe('Multiline EHLO Response Parsing (SEC-004)', () => {
    /**
     * Simulates the multiline response detection logic
     * Must match the implementation in smtp-starttls.ts
     */
    function parseMultilineResponse(buffer: string): { isComplete: boolean; allLines: string[] } {
      // Note: After splitting by \r?\n, lines should not contain \r, but we filter empty strings
      const lines = buffer.split(/\r?\n/).filter((l) => l.trim());

      if (lines.length === 0) {
        return { isComplete: false, allLines: [] };
      }

      const lastLine = lines[lines.length - 1];
      // Final line format: "xxx " (space after 3-digit code)
      // Continuation format: "xxx-" (hyphen after 3-digit code)
      const isComplete = /^\d{3}\s/.test(lastLine);

      return { isComplete, allLines: lines };
    }

    it('should detect incomplete multiline response (continuation lines)', () => {
      const buffer = '250-mail.example.com Hello\r\n250-SIZE 52428800\r\n';

      const result = parseMultilineResponse(buffer);

      expect(result.isComplete).toBe(false);
      expect(result.allLines).toHaveLength(2);
    });

    it('should detect complete multiline response', () => {
      const buffer = '250-mail.example.com Hello\r\n250-SIZE 52428800\r\n250 HELP\r\n';

      const result = parseMultilineResponse(buffer);

      expect(result.isComplete).toBe(true);
      expect(result.allLines).toHaveLength(3);
    });

    it('should handle single-line response', () => {
      const buffer = '250 mail.example.com\r\n';

      const result = parseMultilineResponse(buffer);

      expect(result.isComplete).toBe(true);
      expect(result.allLines).toHaveLength(1);
    });

    it('should find STARTTLS in multiline response', () => {
      const buffer =
        '250-mail.example.com Hello\r\n' +
        '250-SIZE 52428800\r\n' +
        '250-STARTTLS\r\n' +
        '250 HELP\r\n';

      const { allLines } = parseMultilineResponse(buffer);

      // SEC-004: The combined message should contain STARTTLS
      const combinedMessage = allLines.join('\n');
      expect(combinedMessage.toUpperCase()).toContain('STARTTLS');
    });

    it('should find STARTTLS in middle of multiline response', () => {
      const buffer =
        '250-mail.example.com Hello\r\n' +
        '250-STARTTLS\r\n' +
        '250-SIZE 52428800\r\n' +
        '250 HELP\r\n';

      const { allLines } = parseMultilineResponse(buffer);

      const combinedMessage = allLines.join('\n');
      expect(combinedMessage.toUpperCase()).toContain('STARTTLS');
    });

    it('should not find STARTTLS when not present', () => {
      const buffer = '250-mail.example.com Hello\r\n' + '250-SIZE 52428800\r\n' + '250 HELP\r\n';

      const { allLines } = parseMultilineResponse(buffer);

      const combinedMessage = allLines.join('\n');
      expect(combinedMessage.toUpperCase()).not.toContain('STARTTLS');
    });

    it('should handle Windows line endings', () => {
      const buffer = '250-mail.example.com Hello\r\n250 HELP\r\n';

      const result = parseMultilineResponse(buffer);

      expect(result.isComplete).toBe(true);
    });

    it('should handle Unix line endings', () => {
      const buffer = '250-mail.example.com Hello\n250 HELP\n';

      const result = parseMultilineResponse(buffer);

      expect(result.isComplete).toBe(true);
    });
  });
});
