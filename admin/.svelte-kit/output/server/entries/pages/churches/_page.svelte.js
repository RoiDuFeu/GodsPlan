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
function SelectChips($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { options, value, onchange } = $$props;
    $$renderer2.push(`<div class="flex flex-wrap gap-1.5"><!--[-->`);
    const each_array = ensure_array_like(options);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let option = each_array[$$index];
      $$renderer2.push(`<button type="button"${attr_class(`filter-chip relative overflow-hidden cursor-pointer ${stringify(value === option.value ? "filter-chip-active" : "filter-chip-inactive")}`)}>`);
      if (value === option.value) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<span class="absolute inset-0 bg-primary rounded-lg"></span>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <span${attr_class(`relative z-10 transition-colors duration-200 ${stringify(value === option.value ? "text-primary-foreground" : "")}`)}>${escape_html(option.label)}</span></button>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let cityFilter = "";
    let nameFilter = "";
    let reliabilityFilter = "all";
    let officeFilter = "all";
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
        $$renderer3.push(`<div class="flex flex-col sm:flex-row gap-3"><input type="text" placeholder="Filter by name..."${attr("value", nameFilter)} class="input flex-1"/> <input type="text" placeholder="Search by city..."${attr("value", cityFilter)} class="input flex-1"/> `);
        SelectChips($$renderer3, {
          options: [
            { value: "all", label: "All reliability" },
            { value: "excellent", label: "Excellent (90+)" },
            { value: "good", label: "Good (70–89)" },
            { value: "fair", label: "Fair (40–69)" },
            { value: "poor", label: "Poor (<40)" }
          ],
          value: reliabilityFilter,
          onchange: (v) => reliabilityFilter = v
        });
        $$renderer3.push(`<!----> `);
        SelectChips($$renderer3, {
          options: [
            { value: "all", label: "All offices" },
            { value: "confession", label: "Confession" },
            { value: "adoration", label: "Adoration" },
            { value: "vespers", label: "Vespers" },
            { value: "lauds", label: "Lauds" }
          ],
          value: officeFilter,
          onchange: (v) => officeFilter = v
        });
        $$renderer3.push(`<!----></div>`);
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
