import { useState, useCallback } from "react";

interface StartSessionButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function StartSessionButton({ onClick, disabled }: StartSessionButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const handleClick = useCallback(() => {
    if (disabled) return;

    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 400);

    const id = Date.now();
    setRipples(prev => [...prev, { id, x: 50, y: 50 }]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 800);

    onClick();
  }, [onClick, disabled]);

  return (
    <div className="start-session-wrapper" data-testid="start-session-button-wrapper">
      <div className="start-session-energy-ring" />
      <div className="start-session-glow-pulse" />
      <button
        className={`start-session-btn ${isPressed ? "start-session-btn--pressed" : ""} ${disabled ? "start-session-btn--disabled" : ""}`}
        onClick={handleClick}
        disabled={disabled}
        data-testid="button-start-session-main"
        type="button"
        aria-label="Start Session"
      >
        <div className="start-session-btn__inner">
          <div className="start-session-btn__line" />
          <span className="start-session-btn__label-start">START</span>
          <span className="start-session-btn__label-session">SESSION</span>
        </div>

        {ripples.map(ripple => (
          <span
            key={ripple.id}
            className="start-session-ripple"
          />
        ))}

        {isPressed && <div className="start-session-flash" />}
      </button>
    </div>
  );
}
