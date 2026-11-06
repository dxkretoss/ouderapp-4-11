import React, { useMemo } from "react";
import { NavLink as RouterNavLink, useNavigate as useRouterNavigate, useLocation as useRouterLocation, useParams as useRouterParams, useSearchParams, Outlet as RouterOutlet, } from "react-router-dom";
export function Link({ to = "/", params, search, children, className, activeProps, inactiveProps, ...rest }) {
    let resolvedTo = to;
    if (params && typeof resolvedTo === "string") {
        Object.entries(params).forEach(([key, val]) => {
            resolvedTo = resolvedTo.replace(`:${key}`, String(val)).replace(`$${key}`, String(val));
        });
    }
    let searchObj = search;
    if (typeof searchObj === "function") {
        const currentParams = {};
        new URLSearchParams(window.location.search).forEach((v, k) => { currentParams[k] = v; });
        searchObj = searchObj(currentParams);
    }
    if (searchObj && typeof searchObj === "object") {
        const sp = new URLSearchParams();
        Object.entries(searchObj).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== "") {
                sp.set(k, String(v));
            }
        });
        const qs = sp.toString();
        if (qs) {
            resolvedTo = `${resolvedTo}${resolvedTo.includes("?") ? "&" : "?"}${qs}`;
        }
    }
    return (<RouterNavLink to={resolvedTo} className={({ isActive }) => {
            const base = typeof className === "function" ? className({ isActive }) : className || "";
            if (isActive && activeProps?.className)
                return `${base} ${activeProps.className}`;
            if (!isActive && inactiveProps?.className)
                return `${base} ${inactiveProps.className}`;
            return base;
        }} {...rest}>
      {children}
    </RouterNavLink>);
}
export function useNavigate() {
    const navigate = useRouterNavigate();
    return useMemo(() => {
        return (options) => {
            if (typeof options === "string") {
                navigate(options);
            }
            else if (options && typeof options.to === "string") {
                let dest = options.to;
                if (options.params) {
                    Object.entries(options.params).forEach(([k, v]) => {
                        dest = dest.replace(`:${k}`, String(v)).replace(`$${k}`, String(v));
                    });
                }
                let searchObj = options.search;
                if (typeof searchObj === "function") {
                    const currentParams = {};
                    new URLSearchParams(window.location.search).forEach((v, k) => { currentParams[k] = v; });
                    searchObj = searchObj(currentParams);
                }
                if (searchObj && typeof searchObj === "object") {
                    const sp = new URLSearchParams();
                    Object.entries(searchObj).forEach(([k, v]) => {
                        if (v !== undefined && v !== null && v !== "") {
                            sp.set(k, String(v));
                        }
                    });
                    const qs = sp.toString();
                    if (qs) {
                        dest = `${dest}${dest.includes("?") ? "&" : "?"}${qs}`;
                    }
                }
                navigate(dest, { replace: options.replace, state: options.state });
            }
            else if (typeof options === "number") {
                navigate(options);
            }
        };
    }, [navigate]);
}
export function useRouter() {
    const navigate = useNavigate();
    return useMemo(() => ({
        navigate,
        invalidate: () => { },
        state: { location: { pathname: window.location.pathname } },
    }), [navigate]);
}
export function useRouterState({ select } = {}) {
    const location = useRouterLocation();
    const state = useMemo(() => ({
        location: {
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
            href: window.location.href,
        },
        status: "idle",
    }), [location]);
    return select ? select(state) : state;
}
export function useParams() {
    const params = useRouterParams();
    return params;
}
export function useLocation() {
    return useRouterLocation();
}
export function useSearch() {
    const [searchParams] = useSearchParams();
    return useMemo(() => {
        const res = {};
        searchParams.forEach((val, key) => {
            res[key] = val;
        });
        return res;
    }, [searchParams]);
}
export const Outlet = RouterOutlet;
export function redirect(opts) {
    if (opts.to) {
        window.location.href = opts.to;
    }
    return null;
}
export function notFound() {
    return null;
}
export function HeadContent() {
    return null;
}
export function Scripts() {
    return null;
}
export function createFileRoute(path) {
    return function (routeDefinition) {
        const Component = routeDefinition.component || (() => null);
        return {
            path,
            component: Component,
            options: routeDefinition,
            useRouteContext: () => ({
                queryClient: window.__QUERY_CLIENT__,
            }),
            useSearch: () => useSearch(),
            useParams: () => useParams(),
        };
    };
}
export function createRootRouteWithContext() {
    return function (routeDefinition) {
        return {
            component: routeDefinition.component || (() => <Outlet />),
            options: routeDefinition,
            useRouteContext: () => ({
                queryClient: window.__QUERY_CLIENT__,
            }),
        };
    };
}
