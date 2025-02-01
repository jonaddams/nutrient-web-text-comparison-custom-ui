import "./globals.css";

export const metadata = {
  title: "Nutrient Web SDK Text Comparison Example",
  description: "Nutrient Web SDK Text Comparison Example",
};

export default function RootLayout({children}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
