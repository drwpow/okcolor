import React, { useState } from 'react';
import ColorPicker from '@okcolor/picker-react';
import '@okcolor/css/picker.css';

export default function ReactExample() {
	const [hue, setHue] = useState(0);

	return (
		<>
			<input value={hue} />
			<ColorPicker colorspace="oklch" hue={hue} onUpdateHue={setHue} />
		</>
	);
}
