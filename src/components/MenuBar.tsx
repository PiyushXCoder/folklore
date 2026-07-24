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

function MenuItemRow({ action, onDone }: { action: MenuAction; onDone: () => void }) {
  const [submenuOpen, setSubmenuOpen] = useState(false);

  if (action.kind === "submenu") {
    return (
      <div className="menu-dropdown-item menu-dropdown-item-submenu" onClick={() => setSubmenuOpen((o) => !o)}>
        <span className="check" />
        {action.label}
        <span className="submenu-arrow">▶</span>
        {submenuOpen && (
          <div className="menu-dropdown menu-dropdown-nested">
            {(action.children ?? []).map((child) => (
              <button
                key={child.id}
                className="menu-dropdown-item"
                disabled={!child.enabled}
                onClick={(e) => {
                  e.stopPropagation();
                  child.run?.();
                  onDone();
                }}
              >
                <span className="check">{child.kind === "checkbox" && child.checked ? "✓" : ""}</span>
                {child.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      className="menu-dropdown-item"
      disabled={!action.enabled}
      onClick={() => {
        action.run?.();
        onDone();
      }}
    >
      <span className="check">{action.kind === "checkbox" && action.checked ? "✓" : ""}</span>
      {action.label}
    </button>
  );
}

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
                  <MenuItemRow key={action.id} action={action} onDone={() => setOpenMenu(null)} />
                ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
