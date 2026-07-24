import { useEffect } from "react";
import type { MenuAction } from "../lib/menuActions";
import { isDesktop } from "../lib/platform";

const SECTION_LABELS = { file: "File", view: "View", help: "Help" } as const;

export function useNativeMenu(actions: MenuAction[]) {
  useEffect(() => {
    if (!isDesktop()) return;
    let cancelled = false;

    import("@tauri-apps/api/menu").then(async ({ Menu, Submenu, MenuItem, CheckMenuItem }) => {
      const bySection = (section: "file" | "view" | "help") => actions.filter((a) => a.section === section);

      const buildItems = async (section: "file" | "view" | "help") =>
        Promise.all(
          bySection(section).map((action) =>
            action.kind === "checkbox"
              ? CheckMenuItem.new({
                  text: action.label,
                  enabled: action.enabled,
                  checked: Boolean(action.checked),
                  accelerator: action.accelerator,
                  action: action.run,
                })
              : MenuItem.new({
                  text: action.label,
                  enabled: action.enabled,
                  accelerator: action.accelerator,
                  action: action.run,
                }),
          ),
        );

      const submenus = await Promise.all(
        (["file", "view", "help"] as const).map(async (section) =>
          Submenu.new({ text: SECTION_LABELS[section], items: await buildItems(section) }),
        ),
      );

      if (cancelled) return;
      const menu = await Menu.new({ items: submenus });
      if (cancelled) return;
      await menu.setAsAppMenu();
    });

    return () => {
      cancelled = true;
    };
  }, [actions]);
}
