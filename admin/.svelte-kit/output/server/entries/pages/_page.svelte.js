import { e as ensure_array_like, a as attr } from "../../chunks/renderer.js";
import { F as FadeIn } from "../../chunks/FadeIn.js";
import { S as Skeleton } from "../../chunks/Skeleton.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let triggeringIdf = false;
    $$renderer2.push(`<div class="page-container space-y-8">`);
    FadeIn($$renderer2, {
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 page-header"><div><h1 class="page-title">Dashboard</h1> <p class="page-subtitle">Scraper monitoring overview</p></div> <button${attr("disabled", triggeringIdf, true)} class="btn-primary">`);
        {
          $$renderer3.push("<!--[-1-->");
          $$renderer3.push(`Scrape Ile-de-France`);
        }
        $$renderer3.push(`<!--]--></button></div>`);
      }
    });
    $$renderer2.push(`<!----> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="grid grid-cols-2 lg:grid-cols-4 gap-4"><!--[-->`);
      const each_array = ensure_array_like(Array(4));
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        each_array[$$index];
        Skeleton($$renderer2, { class: "h-[100px]" });
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
