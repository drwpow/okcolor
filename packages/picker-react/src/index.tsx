import React from 'react';
import ChromaSquare, { type ChromaColorspace } from '@okcolor/core/dist/chroma-square.js';
import HueWheel from '@okcolor/core/dist/hue-wheel.js';

export interface OkColorPickerProps {
	/** hue (0 - 360) */
	hue: number;
	/** "oklch" (default) | "oklab" | "okhsl" | "display-p3" */
	colorspace: ChromaColorspace;
	/** callback on hue update */
	onUpdateHue?: (newHue: number) => void;
	/** callback on color udpate */
	onColorUpdate?: (newColor: [number, number, number]) => void;
	/** callback on colorspace update */
	onColorspaceUpdate?: (newColorspace: ChromaColorspace) => void;
}

function OKColorPicker({ hue, colorspace, onUpdateHue }: OkColorPickerProps) {
	const [dragData, setDragData] = React.useState<{ startingHue: number; w: number; x: number | undefined }>({
		startingHue: hue,
		w: 300,
		x: undefined,
	});

	// ChromaSquare
	const chromaSquareEl = React.useRef<HTMLCanvasElement>(null);
	const [chromaSquare, setChromaSquare] = React.useState<ChromaSquare | undefined>();
	React.useEffect(() => {
		if (!chromaSquare && chromaSquareEl.current) {
			// initial paint
			const { width, height } = chromaSquareEl.current.getBoundingClientRect();
			const c = new ChromaSquare({
				colorspace,
				canvas: chromaSquareEl.current,
				hue,
				width,
				height,
			});
			setChromaSquare(c);
			c.paint();

			// on resize, repaint (from styling)
			const ro = new ResizeObserver((els) => {
				if (els[0]) {
					c.resize({
						width: els[0].contentRect.width,
						height: els[0].contentRect.height,
					});
					c.paint();
				}
			});
			ro.observe(chromaSquareEl.current);
			return () => ro.disconnect();
		}
	}, [chromaSquare, chromaSquareEl.current]);

	// React to hue
	React.useEffect(() => {
		if (chromaSquare) {
			chromaSquare.setHue(hue);
			chromaSquare.paint();
		}
	}, [hue]);

	// Set global listeners
	React.useEffect(() => {
		function handlePointerMove(evt: PointerEvent) {
			if (dragData.x && onUpdateHue) {
				const newHue = dragData.startingHue + 360 * ((evt.clientX - dragData.x!) / dragData.w);
				onUpdateHue?.(Math.max(Math.min(newHue, 390), 30));
			}
		}
		function handlePointerUp() {
			setDragData((value) => ({ ...value, x: undefined }));
		}
		addEventListener('pointerup', handlePointerUp);
		addEventListener('pointermove', handlePointerMove);
		return () => {
			removeEventListener('pointerup', handlePointerUp);
			removeEventListener('pointermove', handlePointerMove);
		};
	}, [dragData, setDragData, onUpdateHue]);

	return (
		<div className="okcolor-picker">
			<canvas className="okcolor-picker-chromasquare" ref={chromaSquareEl} />
			<div
				className="okcolor-picker-huewheel"
				onPointerDown={(evt) => {
					const rect = (evt.target as HTMLElement).getBoundingClientRect();
					const newHue = (360 * (evt.clientX - rect.left)) / rect.width + 30;
					setDragData({ startingHue: newHue, w: rect.width, x: evt.clientX });
					onUpdateHue?.(newHue);
				}}
			>
				<button type="button" className="okcolor-picker-huewheel-button" style={{ '--x': hue / 360 - 30 / 360 }} />
			</div>
		</div>
	);
}

export default React.memo(OKColorPicker);
