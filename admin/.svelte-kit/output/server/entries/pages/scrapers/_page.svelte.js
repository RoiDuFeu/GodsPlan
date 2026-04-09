import { e as ensure_array_like } from "../../../chunks/renderer.js";
import { F as FadeIn } from "../../../chunks/FadeIn.js";
import { S as Skeleton } from "../../../chunks/Skeleton.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<div class="page-container space-y-8">`);
    FadeIn($$renderer2, {
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="page-header"><h1 class="page-title">Scrapers</h1> <p class="page-subtitle">Manage and monitor all data scrapers</p></div>`);
      }
    });
    $$renderer2.push(`<!----> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"><!--[-->`);
      const each_array = ensure_array_like(Array(3));
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        each_array[$$index];
        Skeleton($$renderer2, { class: "h-[240px]" });
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
