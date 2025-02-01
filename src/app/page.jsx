"use client";
import ReactDOM from "react-dom";
import { useEffect, useRef, useState } from "react";
import Script from "next/script";

export default function Page() {
  const originalDoc = "text-comparison-a.pdf";
  const changedDoc = "text-comparison-b.pdf";
  const numberOfContextWords = 100;
  const licenseKey = process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY;

  // CDN URL for PSPDFKit for Web, could use .env to store these values
  const cdnUrl = "https://cdn.cloud.pspdfkit.com";
  const pspdfkitBaseUrl = `${cdnUrl}/pspdfkit-web@2024.8.1/`;
  const src = `${pspdfkitBaseUrl}pspdfkit.js`;
  ReactDOM.preconnect(cdnUrl);

  // State management for tracking document changes
  const [operationsMap, setOperationsMap] = useState(new Map()); // UI state for rendering changes in the sidebar
  const originalContainerRef = useRef(null); // Ref for the original document viewer container
  const changedContainerRef = useRef(null); // Ref for the changed document viewer container
  const operationsRef = useRef(new Map()); // Ref for tracking changes across all pages

  // Trigger re-render by updating state
  function updateOperationsMap(existingMap) {
    setOperationsMap(new Map(existingMap));
  }

  // Highlight colors for deletions and insertions
  // See tailwind.config.js for color definitions in the tailwind theme
  const deleteHighlightColor = { r: 255, g: 201, b: 203 }; // Light red for deletions
  const insertHighlightColor = { r: 192, g: 216, b: 239 }; // Light blue for insertions

  /*
  Main function to compare documents:
  This function loads the original and changed documents in PSPDFKit viewers
  and compares the text content of each page to identify changes
  It then creates highlight annotations for the changes and updates the state
  to trigger a re-render of the sidebar with the changes
  */
  async function compareDocuments() {
    if (window.PSPDFKit) {
      // This example is importing PSPDFKit through the PSPDFKit CDN
      // If you want to add through a package manager, use the following:
      // import("pspdfkit").then(async (PSPDFKit) => {});

      const originalContainer = originalContainerRef.current;
      const changedContainer = changedContainerRef.current;

      originalContainer ? window.PSPDFKit.unload(originalContainer) : null;
      changedContainer ? window.PSPDFKit.unload(changedContainer) : null;

      let originalInstance = await window.PSPDFKit.load({
        container: originalContainer,
        document: originalDoc,
        baseUrl: pspdfkitBaseUrl,
        styleSheets: ["/styles.css"],
        licenseKey: licenseKey,
      });

      let changedInstance = await window.PSPDFKit.load({
        container: changedContainer,
        document: changedDoc,
        baseUrl: pspdfkitBaseUrl,
        styleSheets: ["/styles.css"],
        licenseKey: licenseKey,
      });

      // add event listeners to sync the view state to the right viewer
      const scrollElement = changedInstance.contentDocument.querySelector(".PSPDFKit-Scroll");
      scrollElement.addEventListener("scroll", syncViewState);
      changedInstance.addEventListener("viewState.currentPageIndex.change", syncViewState);
      changedInstance.addEventListener("viewState.zoom.change", syncViewState);

      // synchronize the view state of the original instance viewer to the changed instance viewer
      function syncViewState() {
        // Get the current view state from the left viewer
        const customViewState = {
          pageNumber: changedInstance.viewState.currentPageIndex,
          zoomLevel: changedInstance.viewState.zoom,
          scrollLeft: changedInstance.contentDocument.querySelector(".PSPDFKit-Scroll").scrollLeft,
          scrollTop: changedInstance.contentDocument.querySelector(".PSPDFKit-Scroll").scrollTop,
        };

        // Set the page number and zoom level for the right viewer
        let viewState = originalInstance.viewState;
        originalInstance.setViewState(viewState.set("currentPageIndex", customViewState.pageNumber));
        originalInstance.setViewState(viewState.set("zoom", customViewState.zoomLevel));

        // Set scroll position for the right viewer
        const scrollElement = originalInstance.contentDocument.querySelector(".PSPDFKit-Scroll");
        scrollElement.scrollLeft = customViewState.scrollLeft;
        scrollElement.scrollTop = customViewState.scrollTop;
      }

      let totalPageCount = await originalInstance.totalPageCount;

      // Process each page in the document
      for (let pageIndex = 0; pageIndex < totalPageCount; pageIndex++) {
        console.log(`comparing page: ${pageIndex + 1} of ${totalPageCount}`);

        // Create a document descriptor for the original document
        const originalDocument = new window.PSPDFKit.DocumentDescriptor({
          filePath: originalDoc,
          pageIndexes: [pageIndex],
        });

        // Create a document descriptor for the changed document
        const changedDocument = new window.PSPDFKit.DocumentDescriptor({
          filePath: changedDoc,
          pageIndexes: [pageIndex],
        });

        // Variables for storing temporary annotation data for each page
        let originalInstanceRects = window.PSPDFKit.Immutable.List([]);
        let changedInstanceRects = window.PSPDFKit.Immutable.List([]);
        // Map to store changes for each page
        let changes = new Map();

        // Get page info for coordinate calculations
        let originalPageInfo = await originalInstance.pageInfoForIndex(pageIndex);
        let changedPageInfo = await changedInstance.pageInfoForIndex(pageIndex);

        // Configure text comparison
        const textComparisonOperation = new window.PSPDFKit.ComparisonOperation(window.PSPDFKit.ComparisonOperationType.TEXT, { numberOfContextWords });

        // Perform text comparison
        const comparisonResult = await originalInstance.compareDocuments({ originalDocument, changedDocument }, textComparisonOperation);

        // Process comparison results
        function processOperation(operation) {
          const rect = operation.changedTextBlocks[0].rect;
          const coordinate = `${rect[0]},${rect[1]}`;

          switch (operation.type) {
            case "delete":
              originalInstanceRects = originalInstanceRects.push(
                // Annotations for the original document
                new PSPDFKit.Geometry.Rect({
                  left: operation.originalTextBlocks[0].rect[0],
                  top: originalPageInfo.height - operation.originalTextBlocks[0].rect[1] - operation.originalTextBlocks[0].rect[3],
                  width: operation.originalTextBlocks[0].rect[2],
                  height: operation.originalTextBlocks[0].rect[3],
                })
              );

              // Sidebar changes Map
              // If the coordinate already exists, add the deleteText value in the existing object
              if (changes.has(coordinate)) {
                changes.set(coordinate, {
                  ...changes.get(coordinate),
                  deleteText: operation.text,
                  del: true,
                });
              } else {
                changes.set(coordinate, {
                  deleteText: operation.text,
                  del: true,
                });
              }
              break;

            case "insert":
              changedInstanceRects = changedInstanceRects.push(
                // Annotations for the changed document
                new PSPDFKit.Geometry.Rect({
                  left: rect[0],
                  top: changedPageInfo.height - rect[1] - rect[3], // Adjust for coordinate system
                  width: rect[2],
                  height: rect[3],
                })
              );

              // Sidebar changes Map
              // Update or create insert change entry
              if (changes.has(coordinate)) {
                changes.set(coordinate, {
                  ...changes.get(coordinate),
                  insertText: operation.text,
                  insert: true,
                });
              } else {
                changes.set(coordinate, {
                  insertText: operation.text,
                  insert: true,
                });
              }
              break;
          }
        }

        // Helper function to create and add highlight annotations
        async function createHighlightAnnotations(pageIndex, originalRects, changedRects, originalInstance, changedInstance) {
          // Create highlight annotations for the original document
          let originalAnnotations = new window.PSPDFKit.Annotations.HighlightAnnotation({
            pageIndex,
            rects: originalRects,
            color: new window.PSPDFKit.Color(deleteHighlightColor),
          });

          // Create highlight annotations for the changed document
          let changedAnnotations = new window.PSPDFKit.Annotations.HighlightAnnotation({
            pageIndex,
            rects: changedRects,
            color: new window.PSPDFKit.Color(insertHighlightColor),
          });

          // Add annotations to the documents
          await originalInstance.create(originalAnnotations);
          await changedInstance.create(changedAnnotations);
        }

        // Iterate through comparison results structure
        comparisonResult.forEach((comparison) => {
          console.log("comparison\n", comparison);
          comparison.documentComparisonResults.forEach((docComparison) => {
            docComparison.comparisonResults.forEach((result) => {
              result.hunks.forEach((hunk) => {
                hunk.operations.forEach((operation) => {
                  if (operation.type !== "equal") {
                    processOperation(operation);
                  }
                });
              });
            });
          });
        });

        /*
        Update the stateful operations Map, merge new changes with existing changes.
        This is necessary because the comparison is done per page
        and we need to accumulate changes across all pages to display them in the sidebar.
        The key is the coordinate of the change.
        The value is an object with the text that was deleted and inserted
        and flags to indicate the type of change.
        e.g. { "0,0": { deleteText: "old text", insertText: "new text", del: true, insert: true } }
        The flags are used to determine the type of change and render appropriate styling in the sidebar.
        The sidebar displays the number of words changed and the actual text that was deleted and inserted
        */
        operationsRef.current = new Map([...operationsRef.current, ...changes]);

        // Create and add highlight annotations
        await createHighlightAnnotations(pageIndex, originalInstanceRects, changedInstanceRects, originalInstance, changedInstance);
      }

      // Update state to trigger re-render
      updateOperationsMap(operationsRef.current);
    }
  }

  // Add helper function to count words
  function countWords(text) {
    return text ? text.trim().split(/\s+/).length : 0;
  }

  // Display the number of words added and removed in the sidebar
  function plusMinusDisplayText(operation) {
    const deleteCount = operation.deleteText ? countWords(operation.deleteText) : 0;
    const insertCount = operation.insertText ? countWords(operation.insertText) : 0;

    if (operation.insert && operation.del) {
      return (
        <div className="text-xs">
          <span className="bg-delete-highlight">-{deleteCount}</span>
          {" | "}
          <span className="bg-insert-highlight">+{insertCount}</span>
        </div>
      );
    } else if (operation.insert) {
      return (
        <div className="text-xs">
          <span className="bg-insert-highlight">+{insertCount}</span>
        </div>
      );
    } else {
      return (
        <div className="text-xs">
          <span className="bg-delete-highlight">-{deleteCount}</span>
        </div>
      );
    }
  }

  useEffect(() => {
    compareDocuments();
  }, []);

  return (
    <div>
      {/* PSPDFKit CDN, remove if including via package manager */}
      <Script src={src} strategy="beforeInteractive" />

      <div className="m-4 grid grid-cols-12">
        {/* original document viewer */}
        <div className="min-h-fit col-span-5 border-1">
          <div>
            <p className="text-center p-3">{originalDoc}</p>
          </div>
          <div id="original-document-viewer" ref={originalContainerRef} className="h-lvh" />
        </div>
        {/* changed document viewer */}
        <div className="min-h-fit col-span-5 border-1">
          <div>
            <p className="text-center p-3">{changedDoc}</p>
          </div>
          <div id="changed-document-viewer" ref={changedContainerRef} className="h-lvh" />
        </div>
        {/* changes sidebar */}
        <div className="col-span-2">
          <div className="sm:block border-1">
            <p className="p-3">Changes</p>
            <div>
              {/* display individual operations */}
              {Array.from(operationsMap).map(([key, value]) => (
                <div key={key} className="p-1 border border-gray-400 border-1 rounded mx-auto mb-2 w-11/12">
                  <div className="flex justify-between p-1 pl-0">
                    <div className="text-gray-400 text-xs">{value.insert && value.del ? "replaced" : value.insert ? "inserted" : "deleted"}</div>
                    {plusMinusDisplayText(value)}
                  </div>
                  <div>
                    <p className="text-xs">
                      <span className="bg-delete-highlight">{value.deleteText}</span>
                    </p>
                    <p className="text-xs">
                      <span className="bg-insert-highlight">{value.insertText}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
