# Technical Implementation Details

## Document Processing Workflow

See the [Nutrient Guide](https://www.nutrient.io/guides/web/comparison/compare-text/#programmatic-text-comparison) for More Information

### 1. Initialization Process

```
Load Original PDF ──┐
                   ├──► Set up synchronized viewers
Load Changed PDF ───┘
```

### 2. Compare Text Page-by-Page

```
For each page:                                          // for loop in compareDocuments()
┌─► Create document descriptors for both PDFs           // originalDocument and changedDocument creation
│   │
│   ├─► Get page information (dimensions, etc.)         // originalPageInfo and changedPageInfo
│   │
│   ├─► Perform text comparison                         // textComparisonOperation and comparisonResult
│   │   │
│   │   └─► For each difference found:                  // processOperation() function
│   │       ├─► Create annotations in temporary arrays  // originalInstanceRects, changedInstanceRects
│   │       └─► Create entries in temporary Map         // changes Map
│   │
│   ├─► Create highlight annotations for page           // createHighlightAnnotations()
│   │
│   └─► Update stateful operationsRef with changes      // operationsRef.current
│
└─► Move to next page                                   // continue loop
```

### 2.1 Sidebar Operations Display

```
After document comparison operations are complete:
Trigger a state update to the operations map           // updateOperationsMap
   │
   └─► Iterate map of changes, applies visual styling
```

### 3. UI Update Flow

```
Load Documents in Viewers ──► Add Highlight Annotations Per Page ──►
Trigger Re-render After Last Comparison ──► Sidebar Component Renders
```

## Key Implementation Features

1.  **Change Detection**

- Low-level text comparison
- Configurable context word count
- Efficient diff algorithm implementation

2. **Coordinate System**

   - Coordinate-based annotation for accurate difference highlighting
   - Automatic adjustment for different page sizes and orientations

3. **Memory Management**
   - Page-by-page processing prevents memory issues with large documents
