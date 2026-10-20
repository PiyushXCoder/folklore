import { useEffect } from "react";

/**
 * Breaks a latched native scrollbar drag — the doc scrolling on bare mouse movement with no
 * button held, until the next click.
 *
 * How it happens: the app's scrollers sit flush against the window edges, which is where the
 * compositor's resize border is. Resize the window mid-drag and the compositor steals the
 * pointer grab to run the resize — the webview got the button press but never gets the release,
 * so WebKitGTK keeps the scrollbar latched to the pointer.
 *
 * **A resize is the only safe trigger available to the page.** While a native scrollbar drag is
 * in progress the engine dispatches no mouse or pointer events at all (verified in a real
 * WebKitGTK window: zero mousemove/pointermove/mouseup, only `scroll`) — and that is equally
 * true of a *legitimate* drag and a latched one. So a "scroll with no input behind it" cannot
 * tell the two apart, and acting on it tears down the scrollbar under a user who is still
 * dragging it. Don't reintroduce that. A window resize, on the other hand, essentially can't
 * co-occur with a legitimate drag: the webview holds the implicit grab for the whole drag, so a
 * resize starting mid-drag means the grab was taken away.
 *
 * The cure is to flip `overflow` for one layout pass, which destroys and recreates the scrollbar
 * and takes the latched state with it. (Hiding it via `::-webkit-scrollbar` does *not* — the
 * latched scrollbar object survives that.) Flipping while the compositor still holds the button
 * lets the latch re-form on the next motion, so the flip is repeated over a couple of seconds to
 * cover a resize the user is still in the middle of.
 */
const SCROLLERS = ".app-main, .outline-sidebar";
/** Staggered so a resize the user is still holding gets another attempt after they let go. */
const FLIP_DELAYS_MS = [150, 700, 1600];

function dropScrollbar(el: HTMLElement) {
  const top = el.scrollTop;
  const previous = el.style.overflowY;
  el.style.overflowY = "hidden";
  void el.offsetHeight; // force the layout pass that actually tears the scrollbar down
  el.style.overflowY = previous;
  el.scrollTop = top;
}

export function useScrollLatchRecovery() {
  useEffect(() => {
    let timers: number[] = [];

    function onResize() {
      for (const timer of timers) window.clearTimeout(timer);
      timers = FLIP_DELAYS_MS.map((delay) =>
        window.setTimeout(() => {
          document.querySelectorAll<HTMLElement>(SCROLLERS).forEach(dropScrollbar);
        }, delay),
      );
    }

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, []);
}
