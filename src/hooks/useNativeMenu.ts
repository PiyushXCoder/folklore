import { useEffect } from "react";
import type { CheckMenuItem, MenuItem, Submenu } from "@tauri-apps/api/menu";
import type { MenuAction } from "../lib/menuActions";
import { isDesktop } from "../lib/platform";

const SECTION_LABELS = { file: "File", view: "View", help: "Help" } as const;

export function useNativeMenu(actions: MenuAction[]) {
  useEffect(() => {
    if (!isDesktop()) return;
    let cancelled = false;

    Promise.all([import("@tauri-apps/api/menu"), import("@tauri-apps/api/window")]).then(
      async ([{ Menu, Submenu, MenuItem, CheckMenuItem }, { getCurrentWindow }]) => {
        const buildItem = async (action: MenuAction): Promise<Submenu | MenuItem | CheckMenuItem> => {
          if (action.kind === "submenu") {
            return Submenu.new({
              text: action.label,
              enabled: action.enabled,
              items: await Promise.all((action.children ?? []).map(buildItem)),
            });
          }
          return action.kind === "checkbox"
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
              });
        };

        const bySection = (section: "file" | "view" | "help") => actions.filter((a) => a.section === section);

        const submenus = await Promise.all(
          (["file", "view", "help"] as const).map(async (section) =>
            Submenu.new({ text: SECTION_LABELS[section], items: await Promise.all(bySection(section).map(buildItem)) }),
          ),
        );

        if (cancelled) return;
        const menu = await Menu.new({ items: submenus });
        if (cancelled) return;
        // Window-scoped (not setAsAppMenu) so the About popup window — created with no
        // explicit menu of its own — doesn't inherit this one (macOS is app-wide regardless).
        await menu.setAsWindowMenu(getCurrentWindow());
      },
    );

    return () => {
      cancelled = true;
    };
  }, [actions]);
}
