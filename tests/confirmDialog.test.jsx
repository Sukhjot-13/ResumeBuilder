import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ConfirmDialog from '@/components/common/ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders nothing while closed', () => {
    const html = renderToStaticMarkup(<ConfirmDialog open={false} onConfirm={() => {}} />);
    expect(html).toBe('');
  });

  it('renders an accessible dialog with the action copy', () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog
        open
        title="Delete this resume?"
        description="This cannot be undone."
        confirmLabel="Delete resume"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('Delete this resume?');
    expect(html).toContain('This cannot be undone.');
    expect(html).toContain('Delete resume');
    expect(html).toContain('Cancel');
  });

  it('disables both actions and shows the pending label while a delete is in flight', () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog
        open
        title="Delete this resume?"
        confirmLabel="Delete resume"
        pendingLabel="Deleting..."
        pending
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(html).toContain('Deleting...');
    expect(html.match(/<button[^>]*\bdisabled\b/g)).toHaveLength(2);
  });

  it('renders an inline error without closing the dialog', () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog
        open
        title="Delete this resume?"
        error="Could not delete that resume. Please try again."
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain('Could not delete that resume. Please try again.');
    expect(html).not.toContain('While closed');
  });

  it('uses the warning tone for non-destructive maintenance actions', () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog
        open
        tone="warning"
        title="Reset usage for this user?"
        confirmLabel="Reset usage"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(html).toContain('bg-amber-600');
    expect(html).not.toContain('bg-rose-600');
  });
});
