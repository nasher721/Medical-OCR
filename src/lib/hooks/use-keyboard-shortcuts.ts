import { useEffect } from 'react';

type KeyHandler = (event: KeyboardEvent) => void;

interface ShortcutConfig {
    key: string;
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    handler: KeyHandler;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Ignore if focus is on an input or textarea, unless it's a specific command like Ctrl+Enter
            const target = event.target as HTMLElement;
            const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

            shortcuts.forEach((shortcut) => {
                if (event.key.toLowerCase() === shortcut.key.toLowerCase()) {
                    if (shortcut.ctrlKey && !event.ctrlKey) return;
                    if (shortcut.metaKey && !event.metaKey) return;
                    if (shortcut.shiftKey && !event.shiftKey) return;
                    if (shortcut.altKey && !event.altKey) return;

                    // If it's an input and no modifiers are used (like just 'a'), we probably want to type 'a'
                    // specific logic: if modifier is present, allow it even in inputs (e.g. Cmd+S)
                    // if no modifier, block in inputs
                    const hasModifier = shortcut.ctrlKey || shortcut.metaKey || shortcut.altKey;

                    if (isInput && !hasModifier) return;

                    event.preventDefault();
                    shortcut.handler(event);
                }
            });
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts]);
}
