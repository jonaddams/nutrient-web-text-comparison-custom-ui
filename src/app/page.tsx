"use client";

import type {
	DocumentComparison,
	Geometry,
	Immutable_2 as Immutable,
	Instance,
} from "@nutrient-sdk/viewer";
import { useEffect, useRef, useState } from "react";

type Operation = DocumentComparison.Operation;

interface ChangeOperation {
	deleteText?: string;
	insertText?: string;
	del?: boolean;
	insert?: boolean;
	pageIndex?: number; // Track which page this change is on
}

export default function Page() {
	const originalDoc = "text-comparison-a.pdf";
	const changedDoc = "text-comparison-b.pdf";
	const numberOfContextWords = 100;
	const licenseKey = process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY;

	// State management for tracking document changes
	const [operationsMap, setOperationsMap] = useState<
		Map<string, ChangeOperation>
	>(new Map()); // UI state for rendering changes in the sidebar
	const originalContainerRef = useRef<HTMLDivElement>(null); // Ref for the original document viewer container
	const changedContainerRef = useRef<HTMLDivElement>(null); // Ref for the changed document viewer container
	const operationsRef = useRef<Map<string, ChangeOperation>>(new Map()); // Ref for tracking changes across all pages
	const originalInstanceRef = useRef<Instance | null>(null); // Ref for the original viewer instance
	const changedInstanceRef = useRef<Instance | null>(null); // Ref for the changed viewer instance

	// Trigger re-render by updating state
	function updateOperationsMap(existingMap: Map<string, ChangeOperation>) {
		setOperationsMap(new Map(existingMap));
	}

	/**
	 * Scrolls the viewer to a specific page by calculating the cumulative height
	 * of all pages before it and setting the scroll position.
	 *
	 * This is useful for programmatically navigating to pages that contain
	 * specific annotations or changes.
	 *
	 * @param instance - The Nutrient viewer instance
	 * @param targetPageIndex - Zero-based index of the page to scroll to
	 * @param offsetTop - Optional pixel offset from the top of the page (default: 0)
	 *
	 * @example
	 * // Scroll to page 3 (zero-indexed, so this is the 4th page)
	 * await scrollToPage(originalInstance, 3);
	 *
	 * @example
	 * // Scroll to page 2 with a 100px offset from the top
	 * await scrollToPage(changedInstance, 2, 100);
	 */
	async function scrollToPage(
		instance: Instance,
		targetPageIndex: number,
		offsetTop = 0,
	): Promise<void> {
		const scrollContainer = instance.contentDocument.querySelector(
			".PSPDFKit-Scroll",
		) as HTMLElement | null;

		if (!scrollContainer) {
			console.warn("Scroll container not found");
			return;
		}

		// Calculate cumulative height of all pages before the target page
		let cumulativeHeight = 0;

		for (let i = 0; i < targetPageIndex; i++) {
			const pageInfo = await instance.pageInfoForIndex(i);
			if (!pageInfo) continue;

			// Account for zoom level
			const zoom = instance.viewState.zoom;
			const zoomValue = typeof zoom === "number" ? zoom : 1;
			cumulativeHeight += pageInfo.height * zoomValue;

			// Add page spacing (gap between pages in the viewer)
			// The viewer typically has a 10px gap between pages
			cumulativeHeight += 10;
		}

		// Add the offset within the target page
		cumulativeHeight += offsetTop;

		// Scroll to the calculated position with smooth behavior
		scrollContainer.scrollTo({
			top: cumulativeHeight,
			behavior: "smooth",
		});

		// Also update the ViewState to ensure page index is correct
		const viewState = instance.viewState;
		instance.setViewState(viewState.set("currentPageIndex", targetPageIndex));
	}

	// Highlight colors for deletions and insertions
	// See tailwind.config.js for color definitions in the tailwind theme
	const deleteHighlightColor = { r: 255, g: 201, b: 203 }; // Light red for deletions
	const insertHighlightColor = { r: 192, g: 216, b: 239 }; // Light blue for insertions

	/*
  Main function to compare documents:
  This function loads the original and changed documents in Nutrient viewers
  and compares the text content of each page to identify changes
  It then creates highlight annotations for the changes and updates the state
  to trigger a re-render of the sidebar with the changes
  */
	async function compareDocuments() {
		if (window.NutrientViewer) {
			// This example is importing Nutrient SDK through the CDN
			// If you want to add through a package manager, use the following:
			// import("@nutrient-sdk/viewer").then(async (NutrientViewer) => {});

			const originalContainer = originalContainerRef.current;
			const changedContainer = changedContainerRef.current;

			originalContainer
				? window.NutrientViewer.unload(originalContainer)
				: null;
			changedContainer ? window.NutrientViewer.unload(changedContainer) : null;

			const originalInstance: Instance = await window.NutrientViewer.load({
				container: originalContainer,
				document: originalDoc,
				useCDN: true,
				styleSheets: ["/styles.css"],
				licenseKey: licenseKey,
			});

			const changedInstance: Instance = await window.NutrientViewer.load({
				container: changedContainer,
				document: changedDoc,
				useCDN: true,
				styleSheets: ["/styles.css"],
				licenseKey: licenseKey,
			});

			// Store instances in refs for access from click handlers
			originalInstanceRef.current = originalInstance;
			changedInstanceRef.current = changedInstance;

			// add event listeners to sync the view state to the right viewer
			const scrollElement =
				changedInstance.contentDocument.querySelector(".PSPDFKit-Scroll");
			scrollElement?.addEventListener("scroll", syncViewState);
			changedInstance.addEventListener(
				"viewState.currentPageIndex.change",
				syncViewState,
			);
			changedInstance.addEventListener("viewState.zoom.change", syncViewState);

			// synchronize the view state of the original instance viewer to the changed instance viewer
			function syncViewState() {
				// Get the current view state from the left viewer
				const changedScrollElement =
					changedInstance.contentDocument.querySelector(
						".PSPDFKit-Scroll",
					) as HTMLElement | null;

				const customViewState = {
					pageNumber: changedInstance.viewState.currentPageIndex,
					zoomLevel: changedInstance.viewState.zoom,
					scrollLeft: changedScrollElement?.scrollLeft || 0,
					scrollTop: changedScrollElement?.scrollTop || 0,
				};

				// Set the page number and zoom level for the right viewer
				const viewState = originalInstance.viewState;
				originalInstance.setViewState(
					viewState.set("currentPageIndex", customViewState.pageNumber),
				);
				originalInstance.setViewState(
					viewState.set("zoom", customViewState.zoomLevel),
				);

				// Set scroll position for the right viewer
				const originalScrollElement =
					originalInstance.contentDocument.querySelector(
						".PSPDFKit-Scroll",
					) as HTMLElement | null;
				if (originalScrollElement) {
					originalScrollElement.scrollLeft = customViewState.scrollLeft;
					originalScrollElement.scrollTop = customViewState.scrollTop;
				}
			}

			const totalPageCount = await originalInstance.totalPageCount;

			// Process each page in the document
			for (let pageIndex = 0; pageIndex < totalPageCount; pageIndex++) {
				// Create a document descriptor for the original document
				const originalDocument = new window.NutrientViewer.DocumentDescriptor({
					filePath: originalDoc,
					pageIndexes: [pageIndex],
				});

				// Create a document descriptor for the changed document
				const changedDocument = new window.NutrientViewer.DocumentDescriptor({
					filePath: changedDoc,
					pageIndexes: [pageIndex],
				});

				// Variables for storing temporary annotation data for each page
				let originalInstanceRects = window.NutrientViewer.Immutable.List([]);
				let changedInstanceRects = window.NutrientViewer.Immutable.List([]);
				// Map to store changes for each page
				const changes = new Map<string, ChangeOperation>();

				// Configure text comparison
				const textComparisonOperation =
					new window.NutrientViewer.ComparisonOperation(
						window.NutrientViewer.ComparisonOperationType.TEXT,
						{ numberOfContextWords },
					);

				// Perform text comparison
				const comparisonResult = await originalInstance.compareDocuments(
					{ originalDocument, changedDocument },
					textComparisonOperation,
				);

				// Process comparison results
				function processOperation(operation: Operation) {
					const rect = operation.changedTextBlocks[0].rect;
					const coordinate = `${rect[0]},${rect[1]}`;

					switch (operation.type) {
						case "delete":
							originalInstanceRects = originalInstanceRects.push(
								// Annotations for the original document
								new window.NutrientViewer.Geometry.Rect({
									left: operation.originalTextBlocks[0].rect[0],
									top: operation.originalTextBlocks[0].rect[1],
									width: operation.originalTextBlocks[0].rect[2],
									height: operation.originalTextBlocks[0].rect[3],
								}),
							);

							// Sidebar changes Map
							// If the coordinate already exists, add the deleteText value in the existing object
							if (changes.has(coordinate)) {
								changes.set(coordinate, {
									...changes.get(coordinate),
									deleteText: operation.text,
									del: true,
									pageIndex,
								});
							} else {
								changes.set(coordinate, {
									deleteText: operation.text,
									del: true,
									pageIndex,
								});
							}
							break;

						case "insert":
							changedInstanceRects = changedInstanceRects.push(
								// Annotations for the changed document
								new window.NutrientViewer.Geometry.Rect({
									left: rect[0],
									top: rect[1],
									width: rect[2],
									height: rect[3],
								}),
							);

							// Sidebar changes Map
							// Update or create insert change entry
							if (changes.has(coordinate)) {
								changes.set(coordinate, {
									...changes.get(coordinate),
									insertText: operation.text,
									insert: true,
									pageIndex,
								});
							} else {
								changes.set(coordinate, {
									insertText: operation.text,
									insert: true,
									pageIndex,
								});
							}
							break;
					}
				}

				// Helper function to create and add highlight annotations
				async function createHighlightAnnotations(
					pageIndex: number,
					originalRects: Immutable.List<Geometry.Rect>,
					changedRects: Immutable.List<Geometry.Rect>,
					originalInstance: Instance,
					changedInstance: Instance,
				) {
					// Create highlight annotations for the original document
					const originalAnnotations =
						new window.NutrientViewer.Annotations.HighlightAnnotation({
							pageIndex,
							rects: originalRects,
							color: new window.NutrientViewer.Color(deleteHighlightColor),
						});

					// Create highlight annotations for the changed document
					const changedAnnotations =
						new window.NutrientViewer.Annotations.HighlightAnnotation({
							pageIndex,
							rects: changedRects,
							color: new window.NutrientViewer.Color(insertHighlightColor),
						});

					// Add annotations to the documents
					await originalInstance.create(originalAnnotations);
					await changedInstance.create(changedAnnotations);
				}

				// Iterate through comparison results structure
				if (
					comparisonResult &&
					"documentComparisonResults" in comparisonResult
				) {
					comparisonResult.documentComparisonResults.forEach(
						(docComparison) => {
							docComparison.comparisonResults.forEach((result) => {
								result.hunks.forEach((hunk) => {
									hunk.operations.forEach((operation) => {
										if (operation.type !== "equal") {
											processOperation(operation);
										}
									});
								});
							});
						},
					);
				}

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
				await createHighlightAnnotations(
					pageIndex,
					originalInstanceRects,
					changedInstanceRects,
					originalInstance,
					changedInstance,
				);
			}

			// Update state to trigger re-render
			updateOperationsMap(operationsRef.current);
		}
	}

	// Add helper function to count words
	function countWords(text: string | undefined): number {
		return text ? text.trim().split(/\s+/).length : 0;
	}

	// Display the number of words added and removed in the sidebar
	function plusMinusDisplayText(operation: ChangeOperation) {
		const deleteCount = operation.deleteText
			? countWords(operation.deleteText)
			: 0;
		const insertCount = operation.insertText
			? countWords(operation.insertText)
			: 0;

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

	// Handle clicking on a sidebar item to scroll to that page
	function handleChangeClick(operation: ChangeOperation) {
		if (
			operation.pageIndex !== undefined &&
			originalInstanceRef.current &&
			changedInstanceRef.current
		) {
			scrollToPage(originalInstanceRef.current, operation.pageIndex);
			scrollToPage(changedInstanceRef.current, operation.pageIndex);
		}
	}

	useEffect(() => {
		compareDocuments();
	}, []);

	return (
		<div>
			<div className="m-4 grid grid-cols-12">
				{/* original document viewer */}
				<div className="min-h-fit col-span-5 border">
					<div>
						<p className="text-center p-3">{originalDoc}</p>
					</div>
					<div
						id="original-document-viewer"
						ref={originalContainerRef}
						className="h-lvh"
					/>
				</div>
				{/* changed document viewer */}
				<div className="min-h-fit col-span-5 border">
					<div>
						<p className="text-center p-3">{changedDoc}</p>
					</div>
					<div
						id="changed-document-viewer"
						ref={changedContainerRef}
						className="h-lvh"
					/>
				</div>
				{/* changes sidebar */}
				<div className="col-span-2">
					<div className="sm:block border">
						<p className="p-3">Changes</p>
						<div>
							{/* display individual operations */}
							{Array.from(operationsMap).map(([key, value]) => (
								<button
									key={key}
									type="button"
									className="p-1 border border-gray-400 rounded-sm mx-auto mb-2 w-11/12 cursor-pointer hover:bg-gray-100 transition-colors text-left block"
									onClick={() => handleChangeClick(value)}
								>
									<div className="flex justify-between p-1 pl-0">
										<div className="text-gray-400 text-xs">
											{value.insert && value.del
												? "replaced"
												: value.insert
													? "inserted"
													: "deleted"}
										</div>
										{plusMinusDisplayText(value)}
									</div>
									<div>
										<p className="text-xs">
											<span className="bg-delete-highlight">
												{value.deleteText}
											</span>
										</p>
										<p className="text-xs">
											<span className="bg-insert-highlight">
												{value.insertText}
											</span>
										</p>
									</div>
								</button>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
