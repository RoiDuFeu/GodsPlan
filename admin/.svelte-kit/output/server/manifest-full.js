export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.OTKrstGT.js",app:"_app/immutable/entry/app.DhwT0ZtU.js",imports:["_app/immutable/entry/start.OTKrstGT.js","_app/immutable/chunks/CjPNFPJd.js","_app/immutable/chunks/CIwSOoWO.js","_app/immutable/entry/app.DhwT0ZtU.js","_app/immutable/chunks/CIwSOoWO.js","_app/immutable/chunks/Ao884JhI.js","_app/immutable/chunks/YziKo4An.js","_app/immutable/chunks/BYeZ6NA4.js","_app/immutable/chunks/DwmWpmIw.js","_app/immutable/chunks/CW6oVDAD.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/coverage",
				pattern: /^\/coverage\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/scrapers",
				pattern: /^\/scrapers\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/scrapers/[name]",
				pattern: /^\/scrapers\/([^/]+?)\/?$/,
				params: [{"name":"name","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
