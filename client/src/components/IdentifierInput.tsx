import { forwardRef, useCallback, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  IDENTIFIER_CHARSET_MESSAGE,
  IDENTIFIER_LENGTH_MESSAGE,
  IDENTIFIER_MAX_LENGTH,
  sanitizeIdentifier,
} from "@shared/identifier";

interface IdentifierInputProps {
  value: string;
  /** Receives the already-sanitised value (A–Z, a–z, 0–9; ≤ 10 chars). */
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

/**
 * IdentifierInput — the one input for every code / article / number in the app
 * (material code, Jumbo stock number, order number, and any future identifier).
 *
 * Enforces the single shared rule live, while typing: forbidden characters
 * (Cyrillic, spaces, punctuation, symbols, emoji) never enter the field, and
 * input stops at 10 characters — for keyboard, paste (Ctrl+V), mobile and
 * desktop alike, because it normalises the resulting value on every change. A
 * short inline hint explains why input was blocked. Display-only over the shared
 * validator — it stores nothing and changes no model.
 */
export const IdentifierInput = forwardRef<HTMLInputElement, IdentifierInputProps>(
  ({ value, onChange, className, ...rest }, ref) => {
    const [message, setMessage] = useState<string | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const flash = useCallback((text: string) => {
      setMessage(text);
      if (timer.current) {
        clearTimeout(timer.current);
      }
      timer.current = setTimeout(() => setMessage(null), 2500);
    }, []);

    const handleChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const raw = event.target.value;
        const sanitized = sanitizeIdentifier(raw);
        if (sanitized !== raw) {
          const hadForbidden = /[^A-Za-z0-9]/.test(raw);
          flash(hadForbidden ? IDENTIFIER_CHARSET_MESSAGE : IDENTIFIER_LENGTH_MESSAGE);
        } else {
          setMessage(null);
        }
        onChange(sanitized);
      },
      [onChange, flash],
    );

    return (
      <div className="space-y-1">
        <Input
          ref={ref}
          {...rest}
          value={value}
          onChange={handleChange}
          maxLength={IDENTIFIER_MAX_LENGTH}
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={message !== null}
          className={cn("rounded-2xl", className)}
        />
        {message ? <p className="text-xs text-destructive">{message}</p> : null}
      </div>
    );
  },
);
IdentifierInput.displayName = "IdentifierInput";
