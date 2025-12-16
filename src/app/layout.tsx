import type { Metadata } from "next";
import Script from "next/script";

import "./globals.css";

export const metadata: Metadata = {
	title: "Nutrient Web SDK Text Comparison Example",
	description: "Nutrient Web SDK Text Comparison Example",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const viewerVersion =
		process.env.NEXT_PUBLIC_NUTRIENT_VIEWER_VERSION || "1.10.0";

	return (
		<html lang="en">
			<body>
				<Script
					src={`https://cdn.cloud.pspdfkit.com/pspdfkit-web@${viewerVersion}/nutrient-viewer.js`}
					strategy="beforeInteractive"
				/>
				{children}
			</body>
		</html>
	);
}
