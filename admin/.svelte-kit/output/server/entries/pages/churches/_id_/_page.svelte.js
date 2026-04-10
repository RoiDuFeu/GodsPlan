import "clsx";
import { f as ssr_context } from "../../../../chunks/renderer.js";
import "../../../../chunks/client.js";
import { S as Skeleton } from "../../../../chunks/Skeleton.js";
function onDestroy(fn) {
  /** @type {SSRContext} */
  ssr_context.r.on_destroy(fn);
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    function cleanupStream() {
    }
    onDestroy(cleanupStream);
    $$renderer2.push(`<div class="page-container space-y-6"><a href="/churches" class="back-link"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M19 12H5M12 19l-7-7 7-7"></path></svg> Back to churches</a> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="space-y-4">`);
      Skeleton($$renderer2, { class: "h-[120px]" });
      $$renderer2.push(`<!----> `);
      Skeleton($$renderer2, { class: "h-[200px]" });
      $$renderer2.push(`<!----></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
