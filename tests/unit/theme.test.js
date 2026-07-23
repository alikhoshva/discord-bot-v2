// tests/unit/theme.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Colors, formatDuration, createProgressBar } from '../../utils/theme.js';

describe('Theme Utility Tests', () => {
  describe('Colors', () => {
    it('should define required color hex values', () => {
      assert.strictEqual(Colors.BRAND, '#6C5CE7');
      assert.strictEqual(Colors.SUCCESS, '#2ECC71');
      assert.strictEqual(Colors.WARNING, '#F1C40F');
      assert.strictEqual(Colors.DANGER, '#E74C3C');
      assert.strictEqual(Colors.AI_DJ, '#FD79A8');
      assert.strictEqual(Colors.INFO, '#0099FF');
    });
  });

  describe('formatDuration()', () => {
    it('should return "Live Stream" for invalid or missing inputs', () => {
      assert.strictEqual(formatDuration(null), 'Live Stream');
      assert.strictEqual(formatDuration(undefined), 'Live Stream');
      assert.strictEqual(formatDuration(NaN), 'Live Stream');
      assert.strictEqual(formatDuration(Infinity), 'Live Stream');
    });

    it('should format seconds and minutes correctly (MM:SS)', () => {
      assert.strictEqual(formatDuration(0), '0:00');
      assert.strictEqual(formatDuration(45000), '0:45');
      assert.strictEqual(formatDuration(65000), '1:05');
      assert.strictEqual(formatDuration(210000), '3:30');
    });

    it('should format hours correctly (HH:MM:SS)', () => {
      assert.strictEqual(formatDuration(3600000), '1:00:00');
      assert.strictEqual(formatDuration(3665000), '1:01:05');
      assert.strictEqual(formatDuration(7384000), '2:03:04');
    });
  });

  describe('createProgressBar()', () => {
    it('should handle live streams correctly', () => {
      const result = createProgressBar(0, null);
      assert.strictEqual(result, '🔴 `LIVE STREAM`');
    });

    it('should create valid progress bar at 0%', () => {
      const result = createProgressBar(0, 100000, 10);
      assert.ok(result.includes('▱▱▱▱▱▱▱▱▱▱'));
      assert.ok(result.includes('**0%**'));
    });

    it('should create valid progress bar at 50%', () => {
      const result = createProgressBar(50000, 100000, 10);
      assert.ok(result.includes('▰▰▰▰▰▱▱▱▱▱'));
      assert.ok(result.includes('**50%**'));
    });

    it('should create valid progress bar at 100%', () => {
      const result = createProgressBar(100000, 100000, 10);
      assert.ok(result.includes('▰▰▰▰▰▰▰▰▰▰'));
      assert.ok(result.includes('**100%**'));
    });

    it('should clamp progress when currentMs exceeds totalMs', () => {
      const result = createProgressBar(150000, 100000, 10);
      assert.ok(result.includes('**100%**'));
    });
  });
});
