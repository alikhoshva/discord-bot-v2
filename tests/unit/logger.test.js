import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import logger from '../../utils/logger.js';

describe('Logger Utility Tests', () => {
  let logCalls = [];
  let warnCalls = [];
  let errorCalls = [];

  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  beforeEach(() => {
    logCalls = [];
    warnCalls = [];
    errorCalls = [];

    console.log = (...args) => logCalls.push(args);
    console.warn = (...args) => warnCalls.push(args);
    console.error = (...args) => errorCalls.push(args);
  });

  afterEach(() => {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  });

  it('should format info log with ISO timestamp and INFO level', () => {
    logger.info('Test info message');
    assert.strictEqual(logCalls.length, 1);
    const [formattedMessage] = logCalls[0];
    assert.match(formattedMessage, /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] Test info message$/);
  });

  it('should format warn log with WARN level', () => {
    logger.warn('Test warning');
    assert.strictEqual(warnCalls.length, 1);
    const [formattedMessage] = warnCalls[0];
    assert.match(formattedMessage, /\[WARN\] Test warning$/);
  });

  it('should format error log with ERROR level and pass extra parameters', () => {
    const err = new Error('Something went wrong');
    logger.error('Failed to execute command', err);
    assert.strictEqual(errorCalls.length, 1);
    const [formattedMessage, errorParam] = errorCalls[0];
    assert.match(formattedMessage, /\[ERROR\] Failed to execute command$/);
    assert.strictEqual(errorParam, err);
  });

  it('should respect level settings', () => {
    const originalLevel = logger.level;
    logger.level = 2; // WARN level (info and debug should be ignored)

    logger.debug('Debug msg');
    logger.info('Info msg');
    logger.warn('Warn msg');

    assert.strictEqual(logCalls.length, 0);
    assert.strictEqual(warnCalls.length, 1);

    logger.level = originalLevel;
  });
});
