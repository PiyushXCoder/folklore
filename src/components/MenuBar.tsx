import { useEffect, useRef, useState } from "react";
import type { MenuAction } from "../lib/menuActions";

interface MenuBarProps {
  actions: MenuAction[];
}

const SECTIONS: { id: "file" | "view" | "help"; label: string }[] = [
  { id: "file", label: "File" },
  { id: "view", label: "View" },
  { id: "help", label: "Help" },
];

export function MenuBar({ actions }: MenuBarProps) {
  const [openMenu, setOpenMenu] = useState<"file" | "view" | "help" | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    function onMouseDown(e: MouseEvent) {
      if (!barRef.current?.contains(e.target as Node)) setOpenMenu(null);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenu(null);
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenu]);

  return (
    <div className="menu-bar" ref={barRef}>
      {SECTIONS.map((section) => (
        <div key={section.id} className={`menu-bar-item${openMenu === section.id ? " is-open" : ""}`}>
          <button onClick={() => setOpenMenu((m) => (m === section.id ? null : section.id))}>
            {section.label}
          </button>
          {openMenu === section.id && (
            <div className="menu-dropdown">
              {actions
                .filter((a) => a.section === section.id)
                .map((action) => (
                  <button
                    key={action.id}
                    className="menu-dropdown-item"
                    disabled={!action.enabled}
                    onClick={() => {
                      action.run();
                      setOpenMenu(null);
                    }}
                  >
                    <span className="check">{action.kind === "checkbox" && action.checked ? "✓" : ""}</span>
                    {action.label}
                  </button>
                ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
