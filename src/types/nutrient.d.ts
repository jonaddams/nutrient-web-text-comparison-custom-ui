// Type definitions for Nutrient Web SDK
// The Nutrient SDK is loaded from CDN and attached to the window object
// We use a flexible type definition since the global API differs slightly from the module exports
declare global {
	interface Window {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		NutrientViewer: any;
		// Legacy alias for backwards compatibility
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		PSPDFKit: any;
	}
}

export {};
