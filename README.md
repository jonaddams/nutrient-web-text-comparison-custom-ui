# PDF Text Comparison Tool

A Next.js application that provides side-by-side comparison of two PDF documents, highlighting text differences using Nutrient's Web SDK.

## Features

- Side-by-side PDF document comparison
- Real-time text difference highlighting
  - Deletions (pink/red - #FFC9CB)
  - Insertions (blue - #C0D8EF)
  - Replacements (shown as both deletion and insertion)
- Synchronized document viewing
  - Scrolling synchronization
  - Zoom level synchronization
- Interactive changes sidebar
  - Lists all modifications
  - Shows change type (inserted/deleted/replaced)
  - Displays modified text with highlighting
  - Visual indicators (+1/-1) for changes

## Technical Implementation

The application uses:
- Next.js for the framework
- Nutrient Web SDK for PDF handling
- React for the UI components
- Tailwind for layout and styles

For detailed technical information about the implementation, including the document processing workflow and architecture, see [Technical Details](./details.md).

### Core Components

1. **Document Viewers**

   - Left viewer: Original document
   - Right viewer: Modified document
   - Synchronized viewing controls

2. **Text Comparison Engine**

   - Page-by-page processing
   - Context-aware text difference detection
   - Coordinate-based highlight annotations

3. **Change Tracking**
   - Maps coordinate data to text changes
   - Maintains change history per page
   - Provides real-time sidebar updates

## Setup

1. Place your PDF files in the public directory:

   - `text-comparison-a.pdf` (original document)
   - `text-comparison-b.pdf` (modified document)

2. Configure environment variables:
   - Copy `.env.example` to `.env.local`
   - Update the values in `.env.local`:
     ```
     # Nutrient SDK Configuration
     NEXT_PUBLIC_NUTRIENT_VIEWER_VERSION=1.10.0
     NEXT_PUBLIC_NUTRIENT_SDK_VERSION=2024.8.1

     # Your Nutrient License Key
     NEXT_PUBLIC_NUTRIENT_LICENSE_KEY=your_license_key_here
     ```
   - To upgrade SDK versions, simply update the version numbers in `.env.local`

3. Install dependencies:

```bash
npm install
# or
yarn install
# or 
pnpm install
```

4. Run the development server:

```bash
npm run dev
# or
yarn dev
```

## Configuration

### Environment Variables

All SDK version configuration is managed through environment variables in `.env.local`:

- `NEXT_PUBLIC_NUTRIENT_VIEWER_VERSION`: Version of the Nutrient Viewer SDK (loaded in layout.tsx)
- `NEXT_PUBLIC_NUTRIENT_SDK_VERSION`: Version of the PSPDFKit SDK (loaded in page.tsx)
- `NEXT_PUBLIC_NUTRIENT_LICENSE_KEY`: Your Nutrient license key

To upgrade SDK versions, simply update these values in your `.env.local` file. No code changes required.

### Code Configuration

Key configuration options in `page.tsx`:

- `numberOfContextWords`: Controls the context size for text comparison (default: 100)
- `deleteHighlightColor`: Color for deleted text highlights
- `insertHighlightColor`: Color for inserted text highlights

## License

This project uses Nutrient Web SDK, which requires a license key for production use.
