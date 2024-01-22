import { oklch } from './lib/oklab.js';
import { createProgram, createRenderingContext } from './lib/webgl2.js';

export type HueColorspace = 'oklch' | 'okhsl' | 'display-p3';
export interface HueWheelOptions {
	/** "oklch" (default) | "okhsl" | "display-p3"  */
	colorspace?: HueColorspace;
	canvas: HTMLCanvasElement;
	/** width, in px */
	width: number;
	/** height, in px */
	height: number;
	/** (optional) lightness */
	lightness?: number;
}

/** vector shader source */
export const HUE_WHEEL_V_SHADER = `#version 300 es

in vec4 a_position;
in vec2 a_resolution;
in float a_hue;
out vec2 v_resolution;

${oklch}

void main() {
	gl_Position = a_position;
	v_resolution = a_resolution;
}`;

/** fragment shader source */
export const HUE_WHEEL_F_SHADER = `#version 300 es
precision highp float;

${oklch}

in vec2 v_resolution;
in float v_hue;
out vec4 f_color;

void main() {
	vec2 xy = gl_FragCoord.xy / v_resolution;
	float h = 360.0 * xy.x;
	// float a = cos(radians(h));
	// float b = sin(radians(h));
	// vec2 cusp = find_cusp(a, b);

	vec3 rgb = oklch_to_srgb(vec3(0.6, 0.15, h), true);
	f_color = vec4(rgb.xyz, 1.0);
}`;

export default class HueWheel {
	// settings
	canvasEl: HTMLCanvasElement;
	colorspace: HueColorspace = 'oklch';
	devicePixelRatio = 1;

	// internal state
	private gl: WebGL2RenderingContext;
	private program: WebGLProgram;
	private attr = { a_position: -1, a_resolution: -1, a_lightness: -1 };
	private lastFrame: number | undefined;

	constructor({ canvas, colorspace, width, height }: HueWheelOptions) {
		this.canvasEl = canvas;
		if (colorspace) {
			this.colorspace = colorspace;
		}
		if (typeof devicePixelRatio === 'number') {
			this.devicePixelRatio = devicePixelRatio;
		}

		this.gl = createRenderingContext(this.canvasEl);
		this.program = createProgram({
			gl: this.gl,
			vShaderSrc: HUE_WHEEL_V_SHADER,
			fShaderSrc: HUE_WHEEL_F_SHADER,
		});

		// get attribute locations
		this.attr.a_position = this.gl.getAttribLocation(this.program, 'a_position');
		this.attr.a_resolution = this.gl.getAttribLocation(this.program, 'a_resolution');
		this.attr.a_lightness = this.gl.getAttribLocation(this.program, 'a_lightness');
		this.gl.enableVertexAttribArray(this.attr.a_position);

		// initial size
		this.resize({ width, height });
	}

	/** change the colorspace */
	setColorspace(colorspace: HueColorspace) {
		this.colorspace = colorspace;
	}

	/** resize the canvas */
	resize({ width, height }: Pick<HueWheelOptions, 'width' | 'height'>) {
		this.gl.canvas.width = width * this.devicePixelRatio;
		this.gl.canvas.height = height * this.devicePixelRatio;
		this.gl.vertexAttrib2f(this.attr.a_resolution, width * this.devicePixelRatio, height * this.devicePixelRatio);
		this.gl.viewport(0, 0, this.gl.canvas.width * this.devicePixelRatio, this.gl.canvas.height * this.devicePixelRatio);
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
