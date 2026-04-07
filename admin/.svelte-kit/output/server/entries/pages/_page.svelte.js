import { a as attr, c as escape_html, e as ensure_array_like } from "../../chunks/renderer.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let triggeringIdf = false;
    $$renderer2.push(`<div class="p-4 md:p-8 max-w-7xl mx-auto space-y-8"><div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"><div><h1 class="font-headline text-2xl font-bold text-on-surface">Dashboard</h1> <p class="text-sm text-on-surface-variant mt-1">Scraper monitoring overview</p></div> <button${attr("disabled", triggeringIdf, true)} class="px-5 py-3 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 min-h-[44px]">${escape_html("Scrape Ile-de-France")}</button></div> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="grid grid-cols-2 lg:grid-cols-4 gap-4"><!--[-->`);
      const each_array = ensure_array_like(Array(4));
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        each_array[$$index];
        $$renderer2.push(`<div class="bg-surface-container rounded-xl border border-outline-variant p-5 h-24 animate-pulse"></div>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
