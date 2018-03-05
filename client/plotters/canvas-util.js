// Passing a context is supposedly faster than prototypical lookup
export function circlePath(context, x, y, radius) {
	context.beginPath();
	context.arc(x, y, radius, 0, 2 * Math.PI, false);
	context.closePath();
}

export function strokePath(context, lineW, strokeColor) {
	context.strokeStyle = strokeColor || 'black';
	context.lineWidth = lineW;
	context.stroke();
}

export function fillPath(context, fillColor) {
	context.fillStyle = fillColor;
	context.fill();
}

export function textSize(context, size) {
	size = size === undefined ? 10 : size;
	// will return an array with [ size, font ] as strings
	const fontArgs = context.font.split(' ');
	const font = fontArgs[fontArgs.length - 1];
	switch (typeof size) {
		case 'number':
			context.font = size + 'px ' + font;
			break;
		case 'string':
			context.font = size + font;
			break;
	}
}

export function textStyle(context, fill, stroke, lineWidth) {

	context.fillStyle = fill === undefined ? 'black' : fill;
	context.strokeStyle = stroke === undefined ? 'rgba(255, 255, 255, 128)' : stroke;
	context.lineWidth = lineWidth === undefined ? 4 : lineWidth;
	context.lineCap = 'round';
	context.lineJoin = 'round';
}

export function drawText(context, text, x, y) {
	context.strokeText(text, x, y);
	context.fillText(text, x, y);
}