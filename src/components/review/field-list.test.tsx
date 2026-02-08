import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldList } from './field-list';

describe('FieldList', () => {
  it('supports clicking and editing fields', async () => {
    const onFieldClick = vi.fn();
    const onFieldEdit = vi.fn();
    const user = userEvent.setup();

    render(
      <FieldList
        fields={[{ id: 'field-1', key: 'invoice_number', value: 'INV-123', confidence: 0.9 } as never]}
        activeFieldId={null}
        onFieldClick={onFieldClick}
        onFieldEdit={onFieldEdit}
      />
    );

    await user.click(screen.getByText('INV-123'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'INV-456');
    await user.tab();

    expect(onFieldEdit).toHaveBeenCalledWith('field-1', 'INV-456');

    await user.click(screen.getByText('Invoice Number'));
    expect(onFieldClick).toHaveBeenCalled();
  });
});
