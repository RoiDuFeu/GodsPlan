import "clsx";
import { e as ensure_array_like, a as attr, b as attr_class, c as escape_html, s as stringify } from "../../chunks/renderer.js";
import { p as page } from "../../chunks/index.js";
function Sidebar($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const navItems = [
      { href: "/", label: "Dashboard", icon: "grid" },
      { href: "/scrapers", label: "Scrapers", icon: "bot" },
      { href: "/coverage", label: "Coverage", icon: "map" }
    ];
    const iconPaths = {
      grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
      bot: "M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7v1a2 2 0 0 1-2 2h-1v3a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-3H5a2 2 0 0 1-2-2v-1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zM9 14a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm6 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z",
      map: "M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zm7-1 8 4v13l-8-4V5z"
    };
    $$renderer2.push(`<aside class="hidden lg:flex flex-col w-64 bg-surface-container-low border-r border-outline-variant h-screen sticky top-0"><div class="p-6 border-b border-outline-variant"><h1 class="font-headline text-xl font-bold text-primary">GodsPlan</h1> <p class="text-xs text-on-surface-variant mt-1">Admin Dashboard</p></div> <nav class="flex-1 p-4 space-y-1"><!--[-->`);
    const each_array = ensure_array_like(navItems);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let item = each_array[$$index];
      const active = page.url.pathname === item.href || item.href !== "/" && page.url.pathname.startsWith(item.href);
      $$renderer2.push(`<a${attr("href", item.href)}${attr_class(`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${stringify(active ? "bg-primary/15 text-primary" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface")}`)}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path${attr("d", iconPaths[item.icon])}></path></svg> ${escape_html(item.label)}</a>`);
    }
    $$renderer2.push(`<!--]--></nav> <div class="p-4 border-t border-outline-variant"><p class="text-xs text-muted-foreground">v1.0.0</p></div></aside>`);
  });
}
function MobileNav($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const navItems = [
      {
        href: "/",
        label: "Dashboard",
        icon: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"
      },
      {
        href: "/scrapers",
        label: "Scrapers",
        icon: "M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7v1a2 2 0 0 1-2 2h-1v3a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-3H5a2 2 0 0 1-2-2v-1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"
      },
      {
        href: "/coverage",
        label: "Coverage",
        icon: "M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zm7-1 8 4v13l-8-4V5z"
      }
    ];
    $$renderer2.push(`<nav class="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-container-low border-t border-outline-variant"><div class="flex items-center justify-around"><!--[-->`);
    const each_array = ensure_array_like(navItems);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let item = each_array[$$index];
      const active = page.url.pathname === item.href || item.href !== "/" && page.url.pathname.startsWith(item.href);
      $$renderer2.push(`<a${attr("href", item.href)}${attr_class(`flex flex-col items-center gap-1 py-3 px-4 min-h-[56px] text-xs font-medium transition-colors ${stringify(active ? "text-primary" : "text-on-surface-variant")}`)}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path${attr("d", item.icon)}></path></svg> ${escape_html(item.label)}</a>`);
    }
    $$renderer2.push(`<!--]--></div></nav>`);
  });
}
function _layout($$renderer, $$props) {
  let { children } = $$props;
  $$renderer.push(`<div class="flex min-h-screen">`);
  Sidebar($$renderer);
  $$renderer.push(`<!----> <main class="flex-1 min-w-0 pb-20 lg:pb-0">`);
  children($$renderer);
  $$renderer.push(`<!----></main> `);
  MobileNav($$renderer);
  $$renderer.push(`<!----></div>`);
}
export {
  _layout as default
};
