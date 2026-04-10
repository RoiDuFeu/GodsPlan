
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/" | "/churches" | "/churches/[id]" | "/liturgy" | "/liturgy/[date]" | "/scrapers" | "/scrapers/[name]";
		RouteParams(): {
			"/churches/[id]": { id: string };
			"/liturgy/[date]": { date: string };
			"/scrapers/[name]": { name: string }
		};
		LayoutParams(): {
			"/": { id?: string; date?: string; name?: string };
			"/churches": { id?: string };
			"/churches/[id]": { id: string };
			"/liturgy": { date?: string };
			"/liturgy/[date]": { date: string };
			"/scrapers": { name?: string };
			"/scrapers/[name]": { name: string }
		};
		Pathname(): "/" | "/churches" | `/churches/${string}` & {} | "/liturgy" | `/liturgy/${string}` & {} | "/scrapers" | `/scrapers/${string}` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/favicon.svg" | string & {};
	}
}