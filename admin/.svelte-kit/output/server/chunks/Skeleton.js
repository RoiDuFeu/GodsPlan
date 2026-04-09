import { b as attr_class, s as stringify } from "./renderer.js";
function Skeleton($$renderer, $$props) {
  let { class: className = "" } = $$props;
  $$renderer.push(`<div${attr_class(`skeleton ${stringify(className)}`, "svelte-19f3yks")}></div>`);
}
export {
  Skeleton as S
};
