import { oklch } from './lib/oklab.js';
import { createProgram, createRenderingContext } from './lib/webgl2.js';

export type ChromaColorspace = 'oklch' | 'okhsl' | 'display-p3';
export interface ChromaSquareOptions {
	canvas: HTMLCanvasElement;
	/** "oklch" (default) | "okhsl" | "display-p3" */
	colorspace?: ChromaColorspace;
	/* width, in px */
	width: number;
	/* height, in px */
	height: number;
	/* 0 – 360 */
	hue: number;
}

/** vector shader source */
export const CHROMA_SQUARE_V_SHADER = `#version 300 es

in vec4 a_position;
in vec2 a_resolution;
in float a_hue;
out float v_hue;
out float v_cusp_l;
out float v_cusp_c;
out vec2 v_resolution;

${oklch}

void main() {
	gl_Position = a_position;
	v_resolution = a_resolution;
	v_hue = a_hue;
	float a = cos(radians(a_hue));
	float b = sin(radians(a_hue));
	vec2 cusp = find_cusp(a, b);
	v_cusp_l = cusp.x;
	v_cusp_c = cusp.y;
}`;

/** fragment shader source */
export const CHROMA_SQUARE_F_SHADER = `#version 300 es
precision highp float;

${oklch}

in vec2 v_resolution;
in float v_hue;
in float v_cusp_l;
in float v_cusp_c;
out vec4 f_color;

void main() {
	float max_c = 0.4; // max displayed chroma; theoretically is 0.4 but for sRGB it’s closer to 0.37
	vec2 xy = gl_FragCoord.xy / v_resolution;
  float l = xy.x;
	float c = xy.y * max_c;
	float c_range = v_cusp_c / max_c;

	// -- OLD --
	// float y_threshold = l < v_cusp_l
	// 	? (l / v_cusp_l) * c_range
	// 	: c_range - (l - v_cusp_l) / (1.0 - v_cusp_l) * c_range;
	// -- OLD --

	vec3 rgb = oklch_to_srgb(vec3(l, c, v_hue), false);
	float y_threshold = c_range * l / v_cusp_l;
	if (xy.y > y_threshold || rgb.x > 1.001 || rgb.y > 1.001 || rgb.z > 1.001) {
		f_color = vec4(1.0, 1.0, 1.0, 1.0);
	} else {
		f_color = vec4(rgb.xyz, 1.0);
	}
}`;

export default class HueSquare {
	colorspace: ChromaColorspace = 'oklch';
	canvasEl: HTMLCanvasElement;
	hue = 0;
	width = 300;
	height = 300;

	gl: WebGL2RenderingContext;
	program: WebGLProgram;

	private attr = { a_position: -1, a_resolution: -1, a_hue: -1, a_chroma: -1 };
	private lastFrame: number | undefined;

	constructor(options: ChromaSquareOptions) {
		this.canvasEl = options.canvas;
		this.width = options.width;
		this.height = options.height;
		this.hue = options.hue;
		if (options?.colorspace) {
			this.colorspace = options.colorspace;
		}

		this.gl = createRenderingContext(this.canvasEl);
		this.program = createProgram({
			gl: this.gl,
			vShaderSrc: CHROMA_SQUARE_V_SHADER,
			fShaderSrc: CHROMA_SQUARE_F_SHADER,
		});
	}

	/** change the colorspace */
	setColorspace(colorspace: ChromaColorspace) {
		this.colorspace = colorspace;
	}

	/** set the 3rd dimension of the hue square */
	setHue(hue: number) {
		this.hue = hue;
	}

	/** resize the canvas */
	resize(options: Pick<ChromaSquareOptions, 'width' | 'height'>) {
		this.width = options.width;
		this.height = options.height;
	}

	/** get color at (x, y) */
	getColor(x: number, y: number): [number, number, number] {
		if (
			typeof x !== 'number' ||
			typeof y !== 'number' ||
			!(x >= 0 && y <= 1 && y >= 0 && y <= 1)
		) {
			throw new Error(
				`getColor(x, y): x and y must be a number between 0 and 1`
			);
		}
		return [0, 0, 0];
	}

	/** paint the canvas (with requestAnimationFrame) */
	paint() {
		if (this.lastFrame) {
			cancelAnimationFrame(this.lastFrame);
		}
		this.lastFrame = requestAnimationFrame(() => {
			const positionBuffer = this.gl.createBuffer();
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
			this.gl.vertexAttribPointer(
				this.attr.a_position,
				2,
				this.gl.FLOAT,
				false,
				0,
				0
			);
			// prettier-ignore
			this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
					-1,-1,		1,-1,		-1, 1, // first triangle
					-1, 1,		1,-1,		 1, 1, // second triangle
				]), this.gl.STATIC_DRAW);
			this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
			this.gl.deleteBuffer(positionBuffer); // clean up

			this.lastFrame = undefined;
		});
	}
}
