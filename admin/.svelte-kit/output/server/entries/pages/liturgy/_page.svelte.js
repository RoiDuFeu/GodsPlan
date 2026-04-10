import { e as ensure_array_like, a as attr, c as escape_html, d as derived } from "../../../chunks/renderer.js";
import { F as FadeIn } from "../../../chunks/FadeIn.js";
import { S as Skeleton } from "../../../chunks/Skeleton.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let refreshing = false;
    let weekOffset = 0;
    let weekDates = derived(() => getWeekDates(weekOffset));
    function getWeekDates(offset) {
      const today = /* @__PURE__ */ new Date();
      const dayOfWeek = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + offset * 7);
      const dates = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        dates.push(d.toISOString().split("T")[0]);
      }
      return dates;
    }
    function weekLabel() {
      if (weekDates().length === 0) return "";
      const start = /* @__PURE__ */ new Date(weekDates()[0] + "T00:00:00");
      const end = /* @__PURE__ */ new Date(weekDates()[6] + "T00:00:00");
      const opts = { day: "numeric", month: "short" };
      if (start.getFullYear() !== end.getFullYear()) {
        return `${start.toLocaleDateString("en-GB", { ...opts, year: "numeric" })} — ${end.toLocaleDateString("en-GB", { ...opts, year: "numeric" })}`;
      }
      return `${start.toLocaleDateString("en-GB", opts)} — ${end.toLocaleDateString("en-GB", { ...opts, year: "numeric" })}`;
    }
    $$renderer2.push(`<div class="page-container space-y-6">`);
    FadeIn($$renderer2, {
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"><div><h1 class="font-headline text-2xl font-bold text-on-surface tracking-tight">Liturgy</h1> <p class="text-sm text-on-surface-variant mt-1">Daily Mass readings — English &amp; French</p></div> <button${attr("disabled", refreshing, true)} class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0">`);
        {
          $$renderer3.push("<!--[-1-->");
          $$renderer3.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5"><path d="M21 12a9 9 0 11-6.219-8.56"></path></svg> Refresh next 14 days`);
        }
        $$renderer3.push(`<!--]--></button></div> `);
        {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]-->`);
      }
    });
    $$renderer2.push(`<!----> `);
    FadeIn($$renderer2, {
      delay: 60,
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="flex items-center justify-between"><button aria-label="Previous week" class="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant hover:text-on-surface"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M15 18l-6-6 6-6"></path></svg></button> <div class="flex items-center gap-3"><span class="text-sm font-semibold text-on-surface">${escape_html(weekLabel())}</span> `);
        {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--></div> <button aria-label="Next week" class="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant hover:text-on-surface"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M9 18l6-6-6-6"></path></svg></button></div>`);
      }
    });
    $$renderer2.push(`<!----> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3"><!--[-->`);
      const each_array = ensure_array_like(Array(7));
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        each_array[$$index];
        Skeleton($$renderer2, { class: "h-[180px]" });
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
