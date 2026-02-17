// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ContractPreview, type EditorTab } from './ContractPreview';
import { EditorVisibilityProvider } from './EditorVisibilityContext';

afterEach(cleanup);

// ---------------------------------------------------------------------------
// Mock useViewportAutoHide — lets us control isNarrow directly
// ---------------------------------------------------------------------------

let mockIsNarrow = false;
/** Capture the setShowSource callback that ContractPreview passes to useViewportAutoHide */
let capturedSetShowSource: ((show: boolean) => void) | null = null;

vi.mock('./useViewportAutoHide', () => ({
  useViewportAutoHide: (_ref: unknown, setShowSource: (show: boolean) => void) => {
    capturedSetShowSource = setShowSource;
    return mockIsNarrow;
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const minimalTabs: EditorTab[] = [
  { id: 'layout', label: 'Layout', filename: 'layout.yaml', source: 'form:\n  id: test\n  title: Test\n  schema: Application\n  scope: california\n  pages: []' },
  { id: 'test-data', label: 'Test Data', filename: 'test-data.yaml', source: 'name: test' },
  { id: 'permissions', label: 'Permissions', filename: 'permissions.yaml', source: 'role: applicant\ndefaults: editable' },
];

const scenarioTabs: EditorTab[] = [
  { id: 'layout', label: 'Layout', filename: 'scenarios/test-app.citizen/layout.yaml', source: 'form:\n  id: test\n  title: Test\n  schema: Application\n  scope: california\n  pages: []' },
  { id: 'test-data', label: 'Test Data', filename: 'scenarios/test-app.citizen/test-data.yaml', source: 'name: test' },
  { id: 'permissions', label: 'Permissions', filename: 'scenarios/test-app.citizen/permissions.yaml', source: 'role: applicant\ndefaults: editable' },
];

function renderPreview({
  isNarrow = false,
  editorVisible = true,
  setVisible = vi.fn(),
  tabs = minimalTabs,
  contractId,
  formTitle,
}: {
  isNarrow?: boolean;
  editorVisible?: boolean;
  setVisible?: (show: boolean) => void;
  tabs?: EditorTab[];
  contractId?: string;
  formTitle?: string;
} = {}) {
  mockIsNarrow = isNarrow;
  capturedSetShowSource = null;
  return render(
    <EditorVisibilityProvider visible={editorVisible} setVisible={setVisible}>
      <ContractPreview
        tabs={tabs}
        contractId={contractId}
        formTitle={formTitle}
        onLayoutChange={vi.fn()}
        onPermissionsChange={vi.fn()}
        onTestDataChange={vi.fn()}
      >
        <div data-testid="form-content">Form Content</div>
      </ContractPreview>
    </EditorVisibilityProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ContractPreview editor visibility via context', () => {
  beforeEach(() => {
    mockIsNarrow = false;
    capturedSetShowSource = null;
  });

  // ── Toolbar toggle (context-driven) ────────────────────────────────────

  it('shows editor when editorVisible is true', () => {
    renderPreview({ editorVisible: true });

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByTestId('form-content')).toBeInTheDocument();
  });

  it('hides editor when editorVisible is false', () => {
    renderPreview({ editorVisible: false });

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByTestId('form-content')).toBeInTheDocument();
  });

  it('toggles editor when context value changes', () => {
    const setVisible = vi.fn();
    const { rerender } = render(
      <EditorVisibilityProvider visible={true} setVisible={setVisible}>
        <ContractPreview
          tabs={minimalTabs}
          onLayoutChange={vi.fn()}
          onPermissionsChange={vi.fn()}
          onTestDataChange={vi.fn()}
        >
          <div data-testid="form-content">Form Content</div>
        </ContractPreview>
      </EditorVisibilityProvider>,
    );

    expect(screen.getByRole('textbox')).toBeInTheDocument();

    rerender(
      <EditorVisibilityProvider visible={false} setVisible={setVisible}>
        <ContractPreview
          tabs={minimalTabs}
          onLayoutChange={vi.fn()}
          onPermissionsChange={vi.fn()}
          onTestDataChange={vi.fn()}
        >
          <div data-testid="form-content">Form Content</div>
        </ContractPreview>
      </EditorVisibilityProvider>,
    );

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByTestId('form-content')).toBeInTheDocument();
  });

  it('re-shows editor when context toggles back to visible', () => {
    const setVisible = vi.fn();
    const props = {
      tabs: minimalTabs,
      onLayoutChange: vi.fn(),
      onPermissionsChange: vi.fn(),
      onTestDataChange: vi.fn(),
    };

    const { rerender } = render(
      <EditorVisibilityProvider visible={true} setVisible={setVisible}>
        <ContractPreview {...props}>
          <div data-testid="form-content">Form Content</div>
        </ContractPreview>
      </EditorVisibilityProvider>,
    );

    // Hide
    rerender(
      <EditorVisibilityProvider visible={false} setVisible={setVisible}>
        <ContractPreview {...props}>
          <div data-testid="form-content">Form Content</div>
        </ContractPreview>
      </EditorVisibilityProvider>,
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    // Show again
    rerender(
      <EditorVisibilityProvider visible={true} setVisible={setVisible}>
        <ContractPreview {...props}>
          <div data-testid="form-content">Form Content</div>
        </ContractPreview>
      </EditorVisibilityProvider>,
    );
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  // ── Wide viewport layout ──────────────────────────────────────────────

  it('shows editor at 45% and form content side-by-side in wide viewport', () => {
    renderPreview({ isNarrow: false, editorVisible: true });

    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect(screen.getByTestId('form-content')).toBeInTheDocument();

    const editorPanel = textarea.closest('div[style*="flex"]') as HTMLElement;
    expect(editorPanel?.style.flex).toBe('0 0 45%');
  });

  it('does not show inline toggle buttons (toolbar controls visibility)', () => {
    renderPreview({ editorVisible: true });

    expect(screen.queryByRole('button', { name: /^Hide Editor$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Show Editor$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Hide$/ })).not.toBeInTheDocument();
  });

  // ── Narrow viewport ───────────────────────────────────────────────────

  it('shows editor at 100% in narrow viewport', () => {
    renderPreview({ isNarrow: true, editorVisible: true });

    const textarea = screen.getByRole('textbox');
    const editorPanel = textarea.closest('div[style*="flex"]') as HTMLElement;
    expect(editorPanel?.style.flex).toBe('1 1 100%');
  });

  it('hides form content when editor is visible in narrow viewport', () => {
    renderPreview({ isNarrow: true, editorVisible: true });

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.queryByTestId('form-content')).not.toBeInTheDocument();
  });

  it('shows form content when editor is hidden in narrow viewport', () => {
    renderPreview({ isNarrow: true, editorVisible: false });

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByTestId('form-content')).toBeInTheDocument();
  });

  // ── Viewport auto-hide syncs with context ─────────────────────────────

  it('passes context setVisible to useViewportAutoHide so toolbar stays in sync', () => {
    const setVisible = vi.fn();
    renderPreview({ isNarrow: false, editorVisible: true, setVisible });

    // The component should have passed setVisible (from context) to useViewportAutoHide
    expect(capturedSetShowSource).toBe(setVisible);
  });

  it('viewport auto-hide calls setVisible(false) which hides editor via context', () => {
    const setVisible = vi.fn();
    const { rerender } = render(
      <EditorVisibilityProvider visible={true} setVisible={setVisible}>
        <ContractPreview
          tabs={minimalTabs}
          onLayoutChange={vi.fn()}
          onPermissionsChange={vi.fn()}
          onTestDataChange={vi.fn()}
        >
          <div data-testid="form-content">Form Content</div>
        </ContractPreview>
      </EditorVisibilityProvider>,
    );

    expect(screen.getByRole('textbox')).toBeInTheDocument();

    // Simulate viewport auto-hide calling setVisible(false)
    // In real usage this updates the toolbar global, which re-renders with visible=false
    expect(capturedSetShowSource).not.toBeNull();
    capturedSetShowSource!(false);
    expect(setVisible).toHaveBeenCalledWith(false);

    // Simulate the toolbar having updated: re-render with visible=false
    rerender(
      <EditorVisibilityProvider visible={false} setVisible={setVisible}>
        <ContractPreview
          tabs={minimalTabs}
          onLayoutChange={vi.fn()}
          onPermissionsChange={vi.fn()}
          onTestDataChange={vi.fn()}
        >
          <div data-testid="form-content">Form Content</div>
        </ContractPreview>
      </EditorVisibilityProvider>,
    );

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByTestId('form-content')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Save-as-Scenario button visibility
// ---------------------------------------------------------------------------

describe('Save-as-Scenario button visibility', () => {
  beforeEach(() => {
    mockIsNarrow = false;
    capturedSetShowSource = null;
  });

  it('shows scenario button inside editor when editor is visible', () => {
    renderPreview({ editorVisible: true, contractId: 'test-app', formTitle: 'Test' });

    expect(screen.getByRole('button', { name: /Save as Scenario/ })).toBeInTheDocument();
  });

  it('hides scenario button when editor is hidden', () => {
    renderPreview({ editorVisible: false, contractId: 'test-app', formTitle: 'Test' });

    expect(screen.queryByRole('button', { name: /Save as Scenario/ })).not.toBeInTheDocument();
    expect(screen.getByTestId('form-content')).toBeInTheDocument();
  });

  it('hides scenario button in narrow viewport with editor hidden', () => {
    renderPreview({ isNarrow: true, editorVisible: false, contractId: 'test-app', formTitle: 'Test' });

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save as Scenario/ })).not.toBeInTheDocument();
    expect(screen.getByTestId('form-content')).toBeInTheDocument();
  });

  it('does not show scenario button when contractId is not set', () => {
    renderPreview({ editorVisible: true });

    expect(screen.queryByRole('button', { name: /Save as Scenario/ })).not.toBeInTheDocument();
  });

  it('hides update scenario button when editor is hidden', () => {
    renderPreview({
      editorVisible: false,
      contractId: 'test-app',
      formTitle: 'Test',
      tabs: scenarioTabs,
    });

    expect(screen.queryByRole('button', { name: /Update Scenario/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save as New Scenario/ })).not.toBeInTheDocument();
    expect(screen.getByTestId('form-content')).toBeInTheDocument();
  });

  it('shows scenario buttons when viewing a scenario with editor visible', () => {
    renderPreview({
      editorVisible: true,
      contractId: 'test-app',
      formTitle: 'Test',
      tabs: scenarioTabs,
    });

    expect(screen.getByRole('button', { name: /Update Scenario/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save as New Scenario/ })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Default context (no provider)
// ---------------------------------------------------------------------------

describe('EditorVisibilityProvider default context', () => {
  beforeEach(() => {
    mockIsNarrow = false;
    capturedSetShowSource = null;
  });

  it('defaults to visible when no provider is present', () => {
    render(
      <ContractPreview
        tabs={minimalTabs}
        onLayoutChange={vi.fn()}
        onPermissionsChange={vi.fn()}
        onTestDataChange={vi.fn()}
      >
        <div data-testid="form-content">Form Content</div>
      </ContractPreview>,
    );

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});
