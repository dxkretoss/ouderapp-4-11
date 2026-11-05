import React, { useMemo, useCallback } from "react";
import {
  Link as RRLink,
  useNavigate as rrUseNavigate,
  useLocation,
  useParams as rrUseParams,
  Navigate,
  Outlet,
  redirect,
} from "react-router-dom";

export function Link({ to, search, params, href, children, ...props }) {
  let path = to || href || "";
  if (typeof path === "string" && params) {
    for (const [key, val] of Object.entries(params)) {
      path = path.replace(`$${key}`, val).replace(`:${key}`, val);
    }
  }
  if (search && typeof search === "object") {
    const paramsStr = new URLSearchParams(
      Object.entries(search).filter(([_, v]) => v !== undefined && v !== null)
    ).toString();
    if (paramsStr) {
      path += (path.includes("?") ? "&" : "?") + paramsStr;
    }
  }
  return (
    <RRLink to={path} {...props}>
      {children}
    </RRLink>
  );
}

export function useNavigate() {
  let navigate;
  try {
    navigate = rrUseNavigate();
  } catch {
    navigate = (target, opts) => {
      if (typeof window !== "undefined") {
        if (opts?.replace) window.location.replace(target);
        else window.location.assign(target);
      }
    };
  }
  return useCallback(
    (opts) => {
      if (typeof opts === "number") return navigate(opts);
      if (typeof opts === "string") return navigate(opts);
      if (opts?.to) {
        let path = opts.to;
        if (opts.params) {
          for (const [k, v] of Object.entries(opts.params)) {
            path = path.replace(`$${k}`, v).replace(`:${k}`, v);
          }
        }
        if (opts.search) {
          const qs = new URLSearchParams(opts.search).toString();
          if (qs) path += (path.includes("?") ? "&" : "?") + qs;
        }
        return navigate(path, { replace: opts.replace });
      }
    },
    [navigate]
  );
}

export function useRouter() {
  const navigate = useNavigate();
  return {
    navigate,
    invalidate: () => {},
  };
}

export function useRouterState({ select } = {}) {
  let location;
  try {
    location = useLocation();
  } catch {
    location = {
      pathname: typeof window !== "undefined" ? window.location.pathname : "/",
      search: typeof window !== "undefined" ? window.location.search : "",
      hash: typeof window !== "undefined" ? window.location.hash : "",
      state: null,
      key: "default",
    };
  }
  const state = { location };
  return select ? select(state) : state;
}

export function useParams() {
  try {
    return rrUseParams() || {};
  } catch {
    return {};
  }
}

export function useSearch() {
  let searchStr = "";
  try {
    const loc = useLocation();
    searchStr = loc.search;
  } catch {
    searchStr = typeof window !== "undefined" ? window.location.search : "";
  }
  return useMemo(() => {
    const sp = new URLSearchParams(searchStr);
    const obj = {};
    for (const [k, v] of sp.entries()) {
      if (v === "true") obj[k] = true;
      else if (v === "false") obj[k] = false;
      else if (!isNaN(Number(v)) && v.trim() !== "") obj[k] = Number(v);
      else obj[k] = v;
    }
    return obj;
  }, [searchStr]);
}

export function createFileRoute(path) {
  return function (config) {
    return {
      path,
      ...config,
      useSearch,
      useParams,
      useNavigate,
      useRouter,
      useRouterState,
      useLoaderData: () => ({}),
      useRouteContext: () => ({ queryClient: window.__queryClient }),
    };
  };
}

export function createRootRouteWithContext() {
  return function (config) {
    return {
      ...config,
      useSearch,
      useParams,
      useNavigate,
      useRouter,
      useRouterState,
      useLoaderData: () => ({}),
      useRouteContext: () => ({ queryClient: window.__queryClient }),
    };
  };
}

export function getRouteApi(path) {
  return {
    useSearch,
    useParams,
    useNavigate,
    useRouter,
    useRouterState,
    useLoaderData: () => ({}),
    useRouteContext: () => ({ queryClient: window.__queryClient }),
  };
}

export function notFound() {
  return { notFound: true };
}

export function HeadContent() {
  return null;
}

export function Scripts() {
  return null;
}

export { Navigate, Outlet, redirect };
