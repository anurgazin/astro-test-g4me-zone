import "cookie";
import { bold, red, yellow, dim, blue } from "kleur/colors";
import "html-escaper";
import "clsx";
import "./chunks/astro_Bg-F9f7K.mjs";
import { compile } from "path-to-regexp";

const dateTimeFormat = new Intl.DateTimeFormat([], {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});
const levels = {
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  silent: 90,
};
function log(opts, level, label, message, newLine = true) {
  const logLevel = opts.level;
  const dest = opts.dest;
  const event = {
    label,
    level,
    message,
    newLine,
  };
  if (!isLogLevelEnabled(logLevel, level)) {
    return;
  }
  dest.write(event);
}
function isLogLevelEnabled(configuredLogLevel, level) {
  return levels[configuredLogLevel] <= levels[level];
}
function info(opts, label, message, newLine = true) {
  return log(opts, "info", label, message, newLine);
}
function warn(opts, label, message, newLine = true) {
  return log(opts, "warn", label, message, newLine);
}
function error(opts, label, message, newLine = true) {
  return log(opts, "error", label, message, newLine);
}
function debug(...args) {
  if ("_astroGlobalDebug" in globalThis) {
    globalThis._astroGlobalDebug(...args);
  }
}
function getEventPrefix({ level, label }) {
  const timestamp = `${dateTimeFormat.format(/* @__PURE__ */ new Date())}`;
  const prefix = [];
  if (level === "error" || level === "warn") {
    prefix.push(bold(timestamp));
    prefix.push(`[${level.toUpperCase()}]`);
  } else {
    prefix.push(timestamp);
  }
  if (label) {
    prefix.push(`[${label}]`);
  }
  if (level === "error") {
    return red(prefix.join(" "));
  }
  if (level === "warn") {
    return yellow(prefix.join(" "));
  }
  if (prefix.length === 1) {
    return dim(prefix[0]);
  }
  return dim(prefix[0]) + " " + blue(prefix.splice(1).join(" "));
}
if (typeof process !== "undefined") {
  let proc = process;
  if ("argv" in proc && Array.isArray(proc.argv)) {
    if (proc.argv.includes("--verbose"));
    else if (proc.argv.includes("--silent"));
    else;
  }
}
class Logger {
  options;
  constructor(options) {
    this.options = options;
  }
  info(label, message, newLine = true) {
    info(this.options, label, message, newLine);
  }
  warn(label, message, newLine = true) {
    warn(this.options, label, message, newLine);
  }
  error(label, message, newLine = true) {
    error(this.options, label, message, newLine);
  }
  debug(label, ...messages) {
    debug(label, ...messages);
  }
  level() {
    return this.options.level;
  }
  forkIntegrationLogger(label) {
    return new AstroIntegrationLogger(this.options, label);
  }
}
class AstroIntegrationLogger {
  options;
  label;
  constructor(logging, label) {
    this.options = logging;
    this.label = label;
  }
  /**
   * Creates a new logger instance with a new label, but the same log options.
   */
  fork(label) {
    return new AstroIntegrationLogger(this.options, label);
  }
  info(message) {
    info(this.options, this.label, message);
  }
  warn(message) {
    warn(this.options, this.label, message);
  }
  error(message) {
    error(this.options, this.label, message);
  }
  debug(message) {
    debug(this.label, message);
  }
}

function getRouteGenerator(segments, addTrailingSlash) {
  const template = segments
    .map((segment) => {
      return (
        "/" +
        segment
          .map((part) => {
            if (part.spread) {
              return `:${part.content.slice(3)}(.*)?`;
            } else if (part.dynamic) {
              return `:${part.content}`;
            } else {
              return part.content
                .normalize()
                .replace(/\?/g, "%3F")
                .replace(/#/g, "%23")
                .replace(/%5B/g, "[")
                .replace(/%5D/g, "]")
                .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            }
          })
          .join("")
      );
    })
    .join("");
  let trailing = "";
  if (addTrailingSlash === "always" && segments.length) {
    trailing = "/";
  }
  const toPath = compile(template + trailing);
  return (params) => {
    const path = toPath(params);
    return path || "/";
  };
}

function deserializeRouteData(rawRouteData) {
  return {
    route: rawRouteData.route,
    type: rawRouteData.type,
    pattern: new RegExp(rawRouteData.pattern),
    params: rawRouteData.params,
    component: rawRouteData.component,
    generate: getRouteGenerator(
      rawRouteData.segments,
      rawRouteData._meta.trailingSlash,
    ),
    pathname: rawRouteData.pathname || void 0,
    segments: rawRouteData.segments,
    prerender: rawRouteData.prerender,
    redirect: rawRouteData.redirect,
    redirectRoute: rawRouteData.redirectRoute
      ? deserializeRouteData(rawRouteData.redirectRoute)
      : void 0,
    fallbackRoutes: rawRouteData.fallbackRoutes.map((fallback) => {
      return deserializeRouteData(fallback);
    }),
    isIndex: rawRouteData.isIndex,
  };
}

function deserializeManifest(serializedManifest) {
  const routes = [];
  for (const serializedRoute of serializedManifest.routes) {
    routes.push({
      ...serializedRoute,
      routeData: deserializeRouteData(serializedRoute.routeData),
    });
    const route = serializedRoute;
    route.routeData = deserializeRouteData(serializedRoute.routeData);
  }
  const assets = new Set(serializedManifest.assets);
  const componentMetadata = new Map(serializedManifest.componentMetadata);
  const inlinedScripts = new Map(serializedManifest.inlinedScripts);
  const clientDirectives = new Map(serializedManifest.clientDirectives);
  return {
    // in case user middleware exists, this no-op middleware will be reassigned (see plugin-ssr.ts)
    middleware(_, next) {
      return next();
    },
    ...serializedManifest,
    assets,
    componentMetadata,
    inlinedScripts,
    clientDirectives,
    routes,
  };
}

const manifest = deserializeManifest({
  adapterName: "@astrojs/vercel/serverless",
  routes: [
    {
      file: "index.html",
      links: [],
      scripts: [],
      styles: [],
      routeData: {
        route: "/",
        isIndex: true,
        type: "page",
        pattern: "^\\/$",
        segments: [],
        params: [],
        component: "src/pages/index.astro",
        pathname: "/",
        prerender: true,
        fallbackRoutes: [],
        _meta: { trailingSlash: "ignore" },
      },
    },
    {
      file: "",
      links: [],
      scripts: [],
      styles: [],
      routeData: {
        type: "endpoint",
        isIndex: false,
        route: "/_image",
        pattern: "^\\/_image$",
        segments: [[{ content: "_image", dynamic: false, spread: false }]],
        params: [],
        component: "node_modules/astro/dist/assets/endpoint/generic.js",
        pathname: "/_image",
        prerender: false,
        fallbackRoutes: [],
        _meta: { trailingSlash: "ignore" },
      },
    },
    {
      file: "",
      links: [],
      scripts: [],
      styles: [
        {
          type: "inline",
          content:
            '.back-link[data-astro-cid-g5kbnxd7]{margin-top:20px;text-decoration:none;color:#fff;font-size:16px;padding:10px 20px;transition:background-color .1s ease}.back-link[data-astro-cid-g5kbnxd7]:hover{color:#838282}.comment[data-astro-cid-ksttp56e]{padding:10px;margin-bottom:10px;overflow-wrap:break-word}.comment-author[data-astro-cid-ksttp56e]{margin-bottom:5px;font-weight:700;font-size:1rem}.comment-date[data-astro-cid-ksttp56e]{margin-bottom:10px;color:#888;font-size:.9rem}.comment-text[data-astro-cid-ksttp56e]{margin-bottom:0;font-size:.9rem}main[data-astro-cid-dpxbdw67]{margin:auto;padding:1rem;width:800px;max-width:calc(100% - 2rem);color:#fff;font-size:20px;line-height:1.6;display:flex;flex-direction:column;justify-content:center;align-items:center}.article-header[data-astro-cid-dpxbdw67] h2[data-astro-cid-dpxbdw67]{font-family:"Jersey 10",sans-serif;font-weight:400;font-style:normal;font-size:2.5rem;margin:0}.article-header[data-astro-cid-dpxbdw67] p[data-astro-cid-dpxbdw67]{font-size:.9rem}.article-body[data-astro-cid-dpxbdw67]{border:1px solid #999;white-space:pre-line;padding:15px;font-size:1rem}.article-comment-grid[data-astro-cid-dpxbdw67]{padding:1rem;display:flex;flex-direction:column;border:1px solid #ccc;border-radius:5px;list-style-type:none}\n@import"https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700&family=Jersey+10&display=swap";.navbar[data-astro-cid-5blmo7yk]{background-color:rgb(var(--accent));padding:1rem}.navbar-nav[data-astro-cid-5blmo7yk]{list-style-type:none;margin:0;padding:0;display:flex;justify-content:space-between;align-items:center}.nav-logo[data-astro-cid-5blmo7yk]{font-family:"Jersey 10",sans-serif;font-weight:400;font-style:normal;font-size:40px;letter-spacing:2px;color:var(--matrix-green)}.nav-menu[data-astro-cid-5blmo7yk]{display:flex;justify-content:space-between;font-family:IBM Plex Mono,monospace;font-weight:400;font-style:normal}.nav-item[data-astro-cid-5blmo7yk]{margin-right:1rem}.nav-link[data-astro-cid-5blmo7yk]{text-decoration:none;color:var(--matrix-green)}.nav-link[data-astro-cid-5blmo7yk]:hover{text-decoration:underline}:root{--matrix-green: #00ff41;--accent: 18, 16, 14;--accent-light: 43, 65, 98;--accent-dark: 49, 10, 101;--accent-gradient: linear-gradient( 90deg, rgb(var(--accent)), rgb(var(--accent-light)) 30%, white 60% )}html{font-family:system-ui,sans-serif;background:#13151a;background-size:224px}code{font-family:Menlo,Monaco,Lucida Console,Liberation Mono,DejaVu Sans Mono,Bitstream Vera Sans Mono,Courier New,monospace}\n',
        },
      ],
      routeData: {
        route: "/articles/[id]",
        isIndex: false,
        type: "page",
        pattern: "^\\/articles\\/([^/]+?)\\/?$",
        segments: [
          [{ content: "articles", dynamic: false, spread: false }],
          [{ content: "id", dynamic: true, spread: false }],
        ],
        params: ["id"],
        component: "src/pages/articles/[id].astro",
        prerender: false,
        fallbackRoutes: [],
        _meta: { trailingSlash: "ignore" },
      },
    },
  ],
  base: "/",
  trailingSlash: "ignore",
  compressHTML: true,
  componentMetadata: [
    [
      "C:/Users/Aldiyar Nurgazin/astro-test/exotic-ephemera/src/pages/articles/[id].astro",
      { propagation: "none", containsHead: true },
    ],
    [
      "C:/Users/Aldiyar Nurgazin/astro-test/exotic-ephemera/src/pages/feed/[...page].astro",
      { propagation: "none", containsHead: true },
    ],
    [
      "C:/Users/Aldiyar Nurgazin/astro-test/exotic-ephemera/src/pages/index.astro",
      { propagation: "none", containsHead: true },
    ],
  ],
  renderers: [],
  clientDirectives: [
    [
      "idle",
      '(()=>{var i=t=>{let e=async()=>{await(await t())()};"requestIdleCallback"in window?window.requestIdleCallback(e):setTimeout(e,200)};(self.Astro||(self.Astro={})).idle=i;window.dispatchEvent(new Event("astro:idle"));})();',
    ],
    [
      "load",
      '(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event("astro:load"));})();',
    ],
    [
      "media",
      '(()=>{var s=(i,t)=>{let a=async()=>{await(await i())()};if(t.value){let e=matchMedia(t.value);e.matches?a():e.addEventListener("change",a,{once:!0})}};(self.Astro||(self.Astro={})).media=s;window.dispatchEvent(new Event("astro:media"));})();',
    ],
    [
      "only",
      '(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event("astro:only"));})();',
    ],
    [
      "visible",
      '(()=>{var l=(s,i,o)=>{let r=async()=>{await(await s())()},t=typeof i.value=="object"?i.value:void 0,c={rootMargin:t==null?void 0:t.rootMargin},n=new IntersectionObserver(e=>{for(let a of e)if(a.isIntersecting){n.disconnect(),r();break}},c);for(let e of o.children)n.observe(e)};(self.Astro||(self.Astro={})).visible=l;window.dispatchEvent(new Event("astro:visible"));})();',
    ],
  ],
  entryModules: {
    "\u0000@astrojs-ssr-virtual-entry": "entry.mjs",
    "\u0000@astro-renderers": "renderers.mjs",
    "\u0000noop-middleware": "_noop-middleware.mjs",
    "/node_modules/astro/dist/assets/endpoint/generic.js":
      "chunks/pages/generic_B89Gdefd.mjs",
    "\u0000@astrojs-manifest": "manifest_DLP5tVl3.mjs",
    "\u0000@astro-page:node_modules/astro/dist/assets/endpoint/generic@_@js":
      "chunks/generic_BXT2u0sv.mjs",
    "\u0000@astro-page:src/pages/articles/[id]@_@astro":
      "chunks/_id__Bv0GAZp1.mjs",
    "\u0000@astro-page:src/pages/feed/[...page]@_@astro":
      "chunks/_.._BLD8tw6s.mjs",
    "\u0000@astro-page:src/pages/index@_@astro": "chunks/index_xC1VvuYU.mjs",
    "astro:scripts/before-hydration.js": "",
  },
  inlinedScripts: [],
  assets: ["/favicon.svg", "/index.html"],
  buildFormat: "directory",
  checkOrigin: false,
});

export {
  AstroIntegrationLogger as A,
  Logger as L,
  getEventPrefix as g,
  levels as l,
  manifest,
};