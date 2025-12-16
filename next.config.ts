import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// Empty turbopack config to silence warning
	// The @nutrient-sdk/viewer package is only used for type definitions
	// and loaded from CDN at runtime, so it doesn't need to be bundled
	turbopack: {},
};

export default nextConfig;
