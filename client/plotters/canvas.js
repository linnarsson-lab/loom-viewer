// Passing a context is supposedly faster than prototypical lookup
export function circle(context, x, y, radius) {
	context.moveTo(x + radius, y);
	context.arc(x, y, radius, 0, 2 * Math.PI);
}

export function textSize(context, size = 10) {
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

export function textStyle(context, fill = 'black', stroke = 'white', lineWidth = 3) {
	context.fillStyle = fill;
	context.strokeStyle = stroke;
	context.lineWidth = lineWidth;
}

export function drawText(context, text, x, y) {
	context.strokeText(text, x, y);
	context.fillText(text, x, y);
}