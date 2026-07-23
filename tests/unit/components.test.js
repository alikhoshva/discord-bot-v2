// tests/unit/components.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlayerControls, buildQueueControls } from '../../utils/components.js';
import { createMockPlayer } from '../mocks/mockMoonlink.js';

describe('UI Component Builder Tests', () => {
  describe('buildPlayerControls()', () => {
    it('should generate ActionRow with 5 player control buttons when playing', () => {
      const player = createMockPlayer({ paused: false, loop: false });
      const actionRow = buildPlayerControls(player);

      assert.ok(actionRow);
      assert.strictEqual(actionRow.components.length, 5);

      const [pauseBtn, skipBtn, stopBtn, queueBtn, loopBtn] = actionRow.components;

      assert.strictEqual(pauseBtn.data.custom_id, 'music_pause_resume');
      assert.strictEqual(pauseBtn.data.label, 'Pause');

      assert.strictEqual(skipBtn.data.custom_id, 'music_skip');
      assert.strictEqual(skipBtn.data.label, 'Skip');

      assert.strictEqual(stopBtn.data.custom_id, 'music_stop');
      assert.strictEqual(stopBtn.data.label, 'Stop');

      assert.strictEqual(queueBtn.data.custom_id, 'music_queue');
      assert.strictEqual(queueBtn.data.label, 'Queue');

      assert.strictEqual(loopBtn.data.custom_id, 'music_loop');
      assert.strictEqual(loopBtn.data.label, 'Loop: OFF');
    });

    it('should show "Resume" label when player is paused', () => {
      const player = createMockPlayer({ paused: true });
      const actionRow = buildPlayerControls(player);
      const pauseBtn = actionRow.components[0];

      assert.strictEqual(pauseBtn.data.label, 'Resume');
    });

    it('should show "Loop: ON" label when player loop mode is enabled', () => {
      const player = createMockPlayer({ loop: true });
      const actionRow = buildPlayerControls(player);
      const loopBtn = actionRow.components[4];

      assert.strictEqual(loopBtn.data.label, 'Loop: ON');
    });
  });

  describe('buildQueueControls()', () => {
    it('should disable Previous button on page 1', () => {
      const actionRow = buildQueueControls(1, 3);
      const [prevBtn, pageIndicator, nextBtn, refreshBtn] = actionRow.components;

      assert.strictEqual(prevBtn.data.disabled, true);
      assert.strictEqual(nextBtn.data.disabled, false);
      assert.strictEqual(pageIndicator.data.label, '1 / 3');
      assert.strictEqual(refreshBtn.data.custom_id, 'music_queue_refresh');
    });

    it('should enable both Previous and Next buttons on middle page', () => {
      const actionRow = buildQueueControls(2, 3);
      const [prevBtn, pageIndicator, nextBtn] = actionRow.components;

      assert.strictEqual(prevBtn.data.disabled, false);
      assert.strictEqual(nextBtn.data.disabled, false);
      assert.strictEqual(pageIndicator.data.label, '2 / 3');
    });

    it('should disable Next button on final page', () => {
      const actionRow = buildQueueControls(3, 3);
      const [prevBtn, pageIndicator, nextBtn] = actionRow.components;

      assert.strictEqual(prevBtn.data.disabled, false);
      assert.strictEqual(nextBtn.data.disabled, true);
      assert.strictEqual(pageIndicator.data.label, '3 / 3');
    });
  });
});
