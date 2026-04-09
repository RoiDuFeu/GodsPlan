import { b as attr_class, c as escape_html, d as derived, s as stringify, e as ensure_array_like, a as attr } from "../../../chunks/renderer.js";
import { F as FadeIn } from "../../../chunks/FadeIn.js";
import { S as Skeleton } from "../../../chunks/Skeleton.js";
function NumberTicker($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      decimals = 0,
      locale = true,
      class: className = ""
    } = $$props;
    let displayValue = 0;
    let formatted = derived(() => {
      const num = decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue);
      if (locale) {
        return Number(num).toLocaleString("fr-FR");
      }
      return String(num);
    });
    $$renderer2.push(`<span${attr_class(`tabular-nums ${stringify(className)}`)}>${escape_html(formatted())}</span>`);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let cityFilter = "";
    let nameFilter = "";
    $$renderer2.push(`<div class="page-container space-y-6">`);
    FadeIn($$renderer2, {
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="page-header"><h1 class="page-title">Churches</h1> <p class="page-subtitle">`);
        NumberTicker($$renderer3, {});
        $$renderer3.push(`<!----> churches in database</p></div>`);
      }
    });
    $$renderer2.push(`<!----> `);
    FadeIn($$renderer2, {
      delay: 60,
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="flex flex-col sm:flex-row gap-3"><input type="text" placeholder="Filter by name..."${attr("value", nameFilter)} class="input flex-1"/> <input type="text" placeholder="Search by city..."${attr("value", cityFilter)} class="input flex-1"/></div>`);
      }
    });
    $$renderer2.push(`<!----> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="space-y-2"><!--[-->`);
      const each_array = ensure_array_like(Array(8));
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        each_array[$$index];
        Skeleton($$renderer2, { class: "h-[52px]" });
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
