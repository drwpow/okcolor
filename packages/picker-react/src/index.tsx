import React from 'react';
import ChromaSquare, {
	type ChromaColorspace,
} from '@okcolor/core/dist/chroma-square.js';
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

function OKColorPicker({ hue, colorspace }: OkColorPickerProps) {
	const wrapperEl = React.useRef<HTMLDivElement>(null);
	const [dimensions, setDimensions] = React.useState({
		width: 400,
		height: 300,
	});

	// HueWheel
	const hueWheelEl = React.useRef<HTMLCanvasElement>(null);
	const [hueWheel, setHueWheel] = React.useState<HueWheel | undefined>();
	React.useEffect(() => {
		if (!hueWheel && hueWheelEl.current) {
			const c = new HueWheel({
				colorspace,
				canvas: hueWheelEl.current,
				width: dimensions.width,
				height: dimensions.height,
			});
			setHueWheel(c);
			c.paint();
		}
	}, [hueWheel, hueWheelEl.current]);
	React.useEffect(() => {
		if (hueWheel) {
			hueWheel.resize(dimensions);
			hueWheel.paint();
		}
	}, [hueWheel, dimensions]);

	// ChromaSquare
	const chromaSquareEl = React.useRef<HTMLCanvasElement>(null);
	const [chromaSquare, setChromaSquare] = React.useState<
		ChromaSquare | undefined
	>();
	React.useEffect(() => {
		if (!chromaSquare && chromaSquareEl.current) {
			const c = new ChromaSquare({
				colorspace,
				canvas: chromaSquareEl.current,
				hue,
				width: dimensions.width,
				height: dimensions.height,
			});
			setChromaSquare(c);
			c.paint();
		}
	}, [chromaSquare, chromaSquareEl.current]);
	React.useEffect(() => {
		if (chromaSquare) {
			chromaSquare.resize(dimensions);
			chromaSquare.paint();
		}
	}, [chromaSquare, dimensions]);
	React.useEffect(() => {
		if (chromaSquare) {
			chromaSquare.setHue(hue);
			chromaSquare.paint();
		}
	}, [chromaSquare, hue]);

	return (
		<div ref={wrapperEl} className="okcolor">
			<canvas className="okcolor-chromasquare" ref={chromaSquareEl} />
			<canvas className="okcolor-huewheel" ref={hueWheelEl} />
		</div>
	);
}

export default React.memo(OKColorPicker);
