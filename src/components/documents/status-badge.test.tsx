import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it('renders the correct label for approved status', () => {
    render(<StatusBadge status="approved" />);
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });
});
