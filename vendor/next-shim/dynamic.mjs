import { createElement, lazy, Suspense } from "react";

/** `ssr` is irrelevant here (this app never server-renders) — just `React.lazy` + `Suspense`. */
export default function dynamic(loader, options = {}) {
  const LazyComponent = lazy(loader);
  const Loading = options.loading;
  return function DynamicComponent(props) {
    return createElement(
      Suspense,
      { fallback: Loading ? createElement(Loading, props) : null },
      createElement(LazyComponent, props),
    );
  };
}
