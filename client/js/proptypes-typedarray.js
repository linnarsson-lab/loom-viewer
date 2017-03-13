export const TypedArrayProp = {
	any: (props, propName, componentName) => {
		let obj = props[propName];
		if (!(obj instanceof Float64Array ||
			obj instanceof Int32Array ||
			obj instanceof Float32Array ||
			obj instanceof Int8Array ||
			obj instanceof Uint8Array ||
			obj instanceof Uint8ClampedArray ||
			obj instanceof Uint32Array ||
			obj instanceof Int16Array ||
			obj instanceof Uint16Array)) {
			return new Error(
				'Invalid prop `' + propName + '` supplied to' +
				' `' + componentName + '`. Expected a TypedArray.'
			);
		}
	},

	float64: (props, propName, componentName) => {
		if (!(props[propName] instanceof Float64Array)) {
			return new Error(
				'Invalid prop `' + propName + '` supplied to' +
				' `' + componentName + '`. Expected a TypedArray.'
			);
		}
	},

	float32: (props, propName, componentName) => {
		if (!(props[propName] instanceof Float32Array)) {
			return new Error(
				'Invalid prop `' + propName + '` supplied to' +
				' `' + componentName + '`. Expected a TypedArray.'
			);
		}
	},

	int32: (props, propName, componentName) => {
		if (!(props[propName] instanceof Int32Array)) {
			return new Error(
				'Invalid prop `' + propName + '` supplied to' +
				' `' + componentName + '`. Expected a TypedArray.'
			);
		}
	},

	int16: (props, propName, componentName) => {
		if (!(props[propName] instanceof Int16Array)) {
			return new Error(
				'Invalid prop `' + propName + '` supplied to' +
				' `' + componentName + '`. Expected a TypedArray.'
			);
		}
	},

	int8: (props, propName, componentName) => {
		if (!(props[propName] instanceof Int8Array)) {
			return new Error(
				'Invalid prop `' + propName + '` supplied to' +
				' `' + componentName + '`. Expected a TypedArray.'
			);
		}
	},

	uint32: (props, propName, componentName) => {
		if (!(props[propName] instanceof Uint32Array)) {
			return new Error(
				'Invalid prop `' + propName + '` supplied to' +
				' `' + componentName + '`. Expected a TypedArray.'
			);
		}
	},

	uint16: (props, propName, componentName) => {
		if (!(props[propName] instanceof Uint16Array)) {
			return new Error(
				'Invalid prop `' + propName + '` supplied to' +
				' `' + componentName + '`. Expected a TypedArray.'
			);
		}
	},

	uint8: (props, propName, componentName) => {
		if (!(props[propName] instanceof Uint8Array)) {
			return new Error(
				'Invalid prop `' + propName + '` supplied to' +
				' `' + componentName + '`. Expected a TypedArray.'
			);
		}
	},

	uint8clamped: (props, propName, componentName) => {
		if (!(props[propName] instanceof Uint8ClampedArray)) {
			return new Error(
				'Invalid prop `' + propName + '` supplied to' +
				' `' + componentName + '`. Expected a TypedArray.'
			);
		}
	},
};

export { TypedArrayProp as default };