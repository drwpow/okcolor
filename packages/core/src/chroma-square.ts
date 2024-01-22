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
out vec2 v_resolution;
out float v_hue;
out vec2 v_cusp;

${oklch}

void main() {
	gl_Position = a_position;
	v_resolution = a_resolution;
	v_hue = a_hue;
	float a = cos(radians(a_hue));
	float b = sin(radians(a_hue));
  v_cusp = find_cusp(a, b);
}`;

/** fragment shader source */
export const CHROMA_SQUARE_F_SHADER = `#version 300 es
precision highp float;

${oklch}

in vec2 v_resolution;
in float v_hue;
in vec2 v_cusp;
out vec4 f_color;

void main() {
	vec2 xy = gl_FragCoord.xy / v_resolution;
	float l_diff = 1.0 - v_cusp.x;
	float max_l = 1.0 - (xy.x * l_diff);
	f_color = vec4(oklch_to_srgb(vec3(xy.y * max_l, xy.x * v_cusp.y * xy.y, v_hue), true), 1.0);
}`;

export default class HueSquare {
	// settings
	canvasEl: HTMLCanvasElement;
	colorspace: ChromaColorspace = 'oklch';
	hue = 0;
	devicePixelRatio = 1;

	private gl: WebGL2RenderingContext;
	private program: WebGLProgram;
	private attr = { a_position: -1, a_resolution: -1, a_hue: -1, a_chroma: -1 };
	private lastFrame: number | undefined;

	constructor({ canvas, hue, colorspace, width, height }: ChromaSquareOptions) {
		this.canvasEl = canvas;
		this.hue = hue;
		if (colorspace) {
			this.colorspace = colorspace;
		}

		this.gl = createRenderingContext(this.canvasEl);
		this.program = createProgram({
			gl: this.gl,
			vShaderSrc: CHROMA_SQUARE_V_SHADER,
			fShaderSrc: CHROMA_SQUARE_F_SHADER,
		});

		// get attribute locations
		this.attr.a_position = this.gl.getAttribLocation(this.program, 'a_position');
		this.attr.a_resolution = this.gl.getAttribLocation(this.program, 'a_resolution');
		this.attr.a_hue = this.gl.getAttribLocation(this.program, 'a_hue');
		this.gl.enableVertexAttribArray(this.attr.a_position);
		this.gl.vertexAttrib1f(this.attr.a_hue, hue);

		// initial size
		this.resize({ width, height });
	}

	/** change the colorspace */
	setColorspace(colorspace: ChromaColorspace) {
		this.colorspace = colorspace;
	}

	/** set the 3rd dimension of the hue square */
	setHue(hue: number) {
		this.hue = hue;
		this.gl.vertexAttrib1f(this.attr.a_hue, hue);
	}

	/** resize the canvas */
	resize({ width, height }: Pick<ChromaSquareOptions, 'width' | 'height'>) {
		this.gl.canvas.width = width * this.devicePixelRatio;
		this.gl.canvas.height = height * this.devicePixelRatio;
		this.gl.vertexAttrib2f(this.attr.a_resolution, width * this.devicePixelRatio, height * this.devicePixelRatio);
		this.gl.viewport(0, 0, this.gl.canvas.width * this.devicePixelRatio, this.gl.canvas.height * this.devicePixelRatio);
	}

	/** get color at (x, y) */
	getColor(x: number, y: number): [number, number, number] {
		if (typeof x !== 'number' || typeof y !== 'number' || !(x >= 0 && y <= 1 && y >= 0 && y <= 1)) {
			throw new Error(`getColor(x, y): x and y must be a number between 0 and 1`);
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
			this.gl.vertexAttribPointer(this.attr.a_position, 2, this.gl.FLOAT, false, 0, 0);
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
