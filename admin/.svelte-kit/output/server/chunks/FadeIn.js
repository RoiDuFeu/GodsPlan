import "clsx";
function FadeIn($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { delay = 0, duration = 500, y = 12, amount = 4, children } = $$props;
    $$renderer2.push(`<div>`);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  FadeIn as F
};
