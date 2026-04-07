import { e as ensure_array_like } from "../../../chunks/renderer.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<div class="p-4 md:p-8 max-w-7xl mx-auto space-y-8"><div><h1 class="font-headline text-2xl font-bold text-on-surface">Scrapers</h1> <p class="text-sm text-on-surface-variant mt-1">Manage and monitor all data scrapers</p></div> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"><!--[-->`);
      const each_array = ensure_array_like(Array(3));
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        each_array[$$index];
        $$renderer2.push(`<div class="bg-surface-container rounded-xl border border-outline-variant p-5 h-48 animate-pulse"></div>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _page as default
};
