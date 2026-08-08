const { test, expect } = require('@playwright/test');
const { promoteThread } = require('./promote');

// Targeting direction, 8 Aug: the officer wants a note on the OVERALL
// conversation, not per message. The example given was *"this doesn't seem like
// a native Russian speaker"* / *"they seem really close"* — a judgement about
// register, authenticity and the relationship between speakers.
//
// That kind of assessment is drawn from reading the thread through, so two
// things have to be true and neither is cosmetic:
//   1. it is stored against the THREAD, so it survives scrolling a stream of
//      thousands and is not attributed to whichever message was on screen;
//   2. it lands at the HEAD of the gold copy, because it is a conclusion about
//      everything below it. Appended at the end it reads as an afterthought.

const ASSESSMENT =
  'Speaker does not read as a native Russian speaker — calques and stock phrasing throughout. The two appear to know each other well.';

test('a conversation note is recorded against the thread and shown above the stream', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('thread-t-1002').click();
  await expect(page.getByTestId('chat-viewer')).toBeVisible();

  // Nothing until the officer writes one.
  await expect(page.getByTestId('thread-note')).toHaveCount(0);

  await page.getByTestId('thread-note-toggle').click();
  await page.getByTestId('thread-note-field').fill(ASSESSMENT);
  await page.getByTestId('thread-note-save').click();

  const note = page.getByTestId('thread-note');
  await expect(note).toBeVisible();
  await expect(note).toContainText('native Russian speaker');
  // Attributed on screen, the same as it will be on paper.
  await expect(note).toContainText(/CONVERSATION NOTE ·/);

  // It belongs to the conversation, so it sits above the message stream rather
  // than inside it — a bubble would read as part of the exchange it judges.
  const noteBox = await note.boundingBox();
  const streamBox = await page.getByTestId('message-stream').boundingBox();
  expect(noteBox.y).toBeLessThan(streamBox.y);

  // And it is not attached to any message.
  await expect(page.locator('app-message-bubble', { hasText: 'native Russian speaker' })).toHaveCount(0);
});

test('the conversation note leads the gold copy, ahead of the transcript', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('thread-t-1002').click();
  await expect(page.getByTestId('chat-viewer')).toBeVisible();
  await page.getByTestId('thread-note-toggle').click();
  await page.getByTestId('thread-note-field').fill(ASSESSMENT);
  await page.getByTestId('thread-note-save').click();

  await promoteThread(page, 't-1002');
  await page.getByTestId('export-btn').click();
  const text = await page.getByTestId('export-text').inputValue();

  expect(text).toContain('CONVERSATION NOTE');
  expect(text).toContain('native Russian speaker');

  // Ahead of the first message line, which is what "leads" means.
  const noteAt = text.indexOf('CONVERSATION NOTE');
  const firstMessageAt = text.search(/\[\d{4}-\d{2}-\d{2} /);
  expect(firstMessageAt).toBeGreaterThan(-1);
  expect(noteAt).toBeLessThan(firstMessageAt);
});

test('a conversation note can be withdrawn', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('thread-t-1002').click();
  await page.getByTestId('thread-note-toggle').click();
  await page.getByTestId('thread-note-field').fill(ASSESSMENT);
  await page.getByTestId('thread-note-save').click();
  await expect(page.getByTestId('thread-note')).toBeVisible();

  // Emptying the field clears it, the same way a verdict can be taken back —
  // an assessment the officer no longer stands behind must not persist.
  await page.getByTestId('thread-note-toggle').click();
  await page.getByTestId('thread-note-field').fill('   ');
  await page.getByTestId('thread-note-save').click();

  await expect(page.getByTestId('thread-note')).toHaveCount(0);
});

test('the note follows the conversation, not the screen', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('thread-t-1002').click();
  await page.getByTestId('thread-note-toggle').click();
  await page.getByTestId('thread-note-field').fill(ASSESSMENT);
  await page.getByTestId('thread-note-save').click();
  await expect(page.getByTestId('thread-note')).toBeVisible();

  // Move away and back: the assessment is thread state, not view state.
  await page.getByTestId('thread-t-1001').click();
  await expect(page.getByTestId('thread-note')).toHaveCount(0);

  await page.getByTestId('thread-t-1002').click();
  await expect(page.getByTestId('thread-note')).toContainText('native Russian speaker');
});
