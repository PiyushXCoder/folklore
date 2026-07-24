import { useEffect, useRef, useState, type RefObject } from "react";
import { useDocSearch } from "../hooks/useDocSearch";

interface SearchBarProps {
  open: boolean;
  onClose: () => void;
  containerRef: RefObject<HTMLDivElement | null>;
  contentKey: unknown;
}

export function SearchBar({ open, onClose, containerRef, contentKey }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { count, activeIndex, goNext, goPrev } = useDocSearch(open ? containerRef.current : null, query, contentKey);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else {
      setQuery("");
    }
  }, [open]);

  if (!open) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) goPrev();
      else goNext();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="search-bar" role="search">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Find in document"
        aria-label="Find in document"
      />
      <span className="search-bar-count">{count === 0 ? (query ? "No results" : "") : `${activeIndex + 1}/${count}`}</span>
      <button onClick={goPrev} disabled={count === 0} title="Previous match">
        ↑
      </button>
      <button onClick={goNext} disabled={count === 0} title="Next match">
        ↓
      </button>
      <button onClick={onClose} title="Close">
        ✕
      </button>
    </div>
  );
}
