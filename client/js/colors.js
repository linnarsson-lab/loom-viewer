import {
	clipRange,
	constrain,
	logProject,
} from './util';

/*
// Category colors from D3 (https://github.com/mbostock/d3/wiki/Ordinal-Scales)
export const category20 = [
	'#ffffff',	// White for zeros
	'#1f77b4',
	'#ff7f0e',
	'#2ca02c',
	'#d62728',
	'#9467bd',
	'#8c564b',
	'#e377c2',
	'#7f7f7f',
	'#bcbd22',
	'#17becf',
	'#9edae5',
	'#aec7e8',
	'#ffbb78',
	'#98df8a',
	'#ff9896',
	'#c5b0d5',
	'#c49c94',
	'#f7b6d2',
	'#c7c7c7',
	'#dbdb8d',
];
*/

const hsluvManual = [
	'#ffffff', '#45d6ff', '#003e75', '#e8a975', '#779d9d', '#ff6060', '#ffd175', '#0078d8', '#c80081', '#00d24b', '#ffafd3', '#00987a', '#ef0007', '#b15aff', '#4169a5', '#ffb77b', '#e55556', '#489655', '#004814', '#d1b500', '#73006d', '#c8458b', '#5a7000', '#7bbfd9', '#698e81', '#d7baff', '#955372', '#4c9191', '#6d4100', '#add500', '#d054c7', '#516e64', '#00e0b5', '#2f5151', '#749100', '#795a9e', '#e5a3c0', '#968647', '#2d5433', '#b7dbff', '#626c4f', '#5587d2', '#00caca', '#852d2e', '#fe00a6', '#367541', '#bd3738', '#957bb7', '#005365', '#a3409c', '#0093b2', '#a7bf72', '#005644', '#a27f67', '#ff8cf6', '#76c5ac', '#3a7171', '#7400b6', '#00ad3d', '#bf6c93', '#897600', '#94005e', '#8fb7ff', '#6c8b98', '#ff9a9a', '#00728b', '#a09673', '#820002', '#e46da8', '#746836', '#536c76', '#c3ace3', '#004545', '#955b00', '#00765e', '#ff37f3', '#7f8b66', '#483d00', '#00a7a7', '#9e00f5', '#c68951', '#5b1a00', '#41836f', '#ad83e0', '#534b2c', '#ca8383', '#589fb8', '#72346d', '#889e50', '#63779f', '#7f775a', '#415200', '#5e7d7d', '#ac9500', '#9e6399', '#008a2f', '#457f93', '#54a48c', '#9e6c3f', '#8196c1', '#7e624f', '#008585', '#6c7e3e', '#002a76', '#5b8060', '#c280bc', '#9759d4', '#73a179', '#3f97ff', '#344c73', '#bf7600', '#d500ca', '#b75b5c',
];

// Mental note: when interpolating color scales, use
// http://gka.github.io/palettes/

const viridis = [
	'#FFFFFF', '#440154', '#440256', '#450457', '#450559', '#46075a', '#46085c', '#460a5d', '#460b5e', '#470d60', '#470e61', '#471063', '#471164', '#471365', '#481467', '#481668', '#481769', '#48186a', '#481a6c', '#481b6d', '#481c6e', '#481d6f', '#481f70', '#482071', '#482173', '#482374', '#482475', '#482576', '#482677', '#482878', '#482979', '#472a7a', '#472c7a', '#472d7b', '#472e7c', '#472f7d', '#46307e', '#46327e', '#46337f', '#463480', '#453581', '#453781', '#453882', '#443983', '#443a83', '#443b84', '#433d84', '#433e85', '#423f85', '#424086', '#424186', '#414287', '#414487', '#404588', '#404688', '#3f4788', '#3f4889', '#3e4989', '#3e4a89', '#3e4c8a', '#3d4d8a', '#3d4e8a', '#3c4f8a', '#3c508b', '#3b518b', '#3b528b', '#3a538b', '#3a548c', '#39558c', '#39568c', '#38588c', '#38598c', '#375a8c', '#375b8d', '#365c8d', '#365d8d', '#355e8d', '#355f8d', '#34608d', '#34618d', '#33628d', '#33638d', '#32648e', '#32658e', '#31668e', '#31678e', '#31688e', '#30698e', '#306a8e', '#2f6b8e', '#2f6c8e', '#2e6d8e', '#2e6e8e', '#2e6f8e', '#2d708e', '#2d718e', '#2c718e', '#2c728e', '#2c738e', '#2b748e', '#2b758e', '#2a768e', '#2a778e', '#2a788e', '#29798e', '#297a8e', '#297b8e', '#287c8e', '#287d8e', '#277e8e', '#277f8e', '#27808e', '#26818e', '#26828e', '#26828e', '#25838e', '#25848e', '#25858e', '#24868e', '#24878e', '#23888e', '#23898e', '#238a8d', '#228b8d', '#228c8d', '#228d8d', '#218e8d', '#218f8d', '#21908d', '#21918c', '#20928c', '#20928c', '#20938c', '#1f948c', '#1f958b', '#1f968b', '#1f978b', '#1f988b', '#1f998a', '#1f9a8a', '#1e9b8a', '#1e9c89', '#1e9d89', '#1f9e89', '#1f9f88', '#1fa088', '#1fa188', '#1fa187', '#1fa287', '#20a386', '#20a486', '#21a585', '#21a685', '#22a785', '#22a884', '#23a983', '#24aa83', '#25ab82', '#25ac82', '#26ad81', '#27ad81', '#28ae80', '#29af7f', '#2ab07f', '#2cb17e', '#2db27d', '#2eb37c', '#2fb47c', '#31b57b', '#32b67a', '#34b679', '#35b779', '#37b878', '#38b977', '#3aba76', '#3bbb75', '#3dbc74', '#3fbc73', '#40bd72', '#42be71', '#44bf70', '#46c06f', '#48c16e', '#4ac16d', '#4cc26c', '#4ec36b', '#50c46a', '#52c569', '#54c568', '#56c667', '#58c765', '#5ac864', '#5cc863', '#5ec962', '#60ca60', '#63cb5f', '#65cb5e', '#67cc5c', '#69cd5b', '#6ccd5a', '#6ece58', '#70cf57', '#73d056', '#75d054', '#77d153', '#7ad151', '#7cd250', '#7fd34e', '#81d34d', '#84d44b', '#86d549', '#89d548', '#8bd646', '#8ed645', '#90d743', '#93d741', '#95d840', '#98d83e', '#9bd93c', '#9dd93b', '#a0da39', '#a2da37', '#a5db36', '#a8db34', '#aadc32', '#addc30', '#b0dd2f', '#b2dd2d', '#b5de2b', '#b8de29', '#bade28', '#bddf26', '#c0df25', '#c2df23', '#c5e021', '#c8e020', '#cae11f', '#cde11d', '#d0e11c', '#d2e21b', '#d5e21a', '#d8e219', '#dae319', '#dde318', '#dfe318', '#e2e418', '#e5e419', '#e7e419', '#eae51a', '#ece51b', '#efe51c', '#f1e51d', '#f4e61e', '#f6e620', '#f8e621', '#fbe723', '#fde725',
];

const inferno = [
	'#FFFFFF', '#000004', '#010005', '#010106', '#010108', '#02010A', '#02020C', '#02020E', '#030210', '#040312', '#040315', '#050417', '#060419', '#07051B', '#08061D', '#090620', '#0A0722', '#0B0724', '#0C0826', '#0D0829', '#0E092B', '#10092D', '#110A30', '#120A32', '#140B35', '#150B37', '#160B3A', '#180C3C', '#190C3E', '#1B0C41', '#1C0C43', '#1E0C46', '#1F0C48', '#210C4A', '#230C4D', '#240C4F', '#260C51', '#280B53', '#2A0B55', '#2B0B57', '#2D0B59', '#2F0A5B', '#310A5D', '#330A5E', '#340A60', '#360961', '#380962', '#3A0963', '#3B0964', '#3D0965', '#3F0966', '#400A67', '#420A68', '#440A69', '#450A69', '#470B6A', '#490B6B', '#4A0C6B', '#4C0C6C', '#4E0D6C', '#4F0D6C', '#510E6D', '#530E6D', '#540F6D', '#560F6E', '#57106E', '#59116E', '#5B116E', '#5C126E', '#5E126F', '#5F136F', '#61146F', '#63146F', '#64156F', '#66156F', '#67166F', '#69176F', '#6B176F', '#6C186F', '#6E186F', '#6F196F', '#71196E', '#731A6E', '#741B6E', '#761B6E', '#771C6E', '#791C6E', '#7B1D6D', '#7C1D6D', '#7E1E6D', '#7F1F6D', '#811F6C', '#82206C', '#84206C', '#86216B', '#87216B', '#89226B', '#8A226A', '#8C236A', '#8E2469', '#8F2469', '#912569', '#922568', '#942668', '#962667', '#972766', '#992866', '#9A2865', '#9C2965', '#9E2964', '#9F2A64', '#A12B63', '#A22B62', '#A42C62', '#A52D61', '#A72D60', '#A92E5F', '#AA2E5F', '#AC2F5E', '#AD305D', '#AF315C', '#B0315C', '#B2325B', '#B3335A', '#B53359', '#B63458', '#B83557', '#B93656', '#BB3655', '#BC3755', '#BE3854', '#BF3953', '#C13A52', '#C23B51', '#C43C50', '#C53C4F', '#C63D4E', '#C83E4D', '#C93F4C', '#CB404B', '#CC414A', '#CD4248', '#CF4347', '#D04446', '#D14545', '#D34644', '#D44843', '#D54942', '#D64A41', '#D84B40', '#D94C3E', '#DA4D3D', '#DB4F3C', '#DC503B', '#DD513A', '#DF5239', '#E05438', '#E15536', '#E25635', '#E35834', '#E45933', '#E55A32', '#E65C30', '#E75D2F', '#E85F2E', '#E9602D', '#EA622B', '#EB632A', '#EB6529', '#EC6628', '#ED6826', '#EE6925', '#EF6B24', '#F06D23', '#F06E21', '#F17020', '#F2711F', '#F2731E', '#F3751C', '#F4761B', '#F4781A', '#F57A18', '#F67B17', '#F67D16', '#F77F14', '#F78113', '#F88212', '#F88410', '#F9860F', '#F9880E', '#F9890C', '#FA8B0B', '#FA8D0A', '#FA8F09', '#FB9108', '#FB9207', '#FB9407', '#FC9606', '#FC9806', '#FC9A06', '#FC9C06', '#FC9E07', '#FDA007', '#FDA108', '#FDA309', '#FDA50A', '#FDA70C', '#FDA90D', '#FDAB0F', '#FDAD11', '#FDAF13', '#FDB114', '#FDB316', '#FDB518', '#FCB71B', '#FCB91D', '#FCBA1F', '#FCBC21', '#FCBE23', '#FBC026', '#FBC228', '#FBC42B', '#FBC62D', '#FAC830', '#FACA32', '#FACC35', '#F9CE38', '#F9D03A', '#F8D23D', '#F8D440', '#F7D643', '#F7D846', '#F6DA49', '#F6DC4C', '#F5DE50', '#F5E053', '#F4E256', '#F4E45A', '#F4E55E', '#F3E761', '#F3E965', '#F3EB69', '#F2ED6D', '#F2EE71', '#F2F075', '#F2F17A', '#F3F37E', '#F3F482', '#F4F686', '#F4F78A', '#F5F98E', '#F6FA92', '#F7FB96', '#F9FC9A', '#FAFD9E', '#FBFEA2', '#FDFFA5',
];

function reverseColors(value, index, array){
	// reverse, but keep '#FFFFFF' at the zero index
	return index > 0 ? array[array.length - index] : value;
}

const viridisReversed = viridis.map(reverseColors);

const infernoReversed = inferno.map(reverseColors);

function blackColor() {
	return 'black';
}

const blackPalette = ['black'];

export function getPalette(colorMode, colorAttr) {
	switch (colorMode) {
		case 'Heatmap':
		case 'Flame':
		case 'Icicle':
			return viridisReversed;
		case 'Categorical':
		case 'Stacked':
			if (colorAttr) {
				const totalCategories = constrain(colorAttr.uniques.length + 1, 1, hsluvManual.length);
				return totalCategories > 1 ?
					hsluvManual.slice(0, totalCategories) :
					blackPalette;
			} else {
				return hsluvManual;
			}
		case 'Bar':
		case 'Box':
		case 'Text':
		default:
			return blackPalette;
	}
}

export function attrToColorFactory(colorAttr, colorMode, settings) {
	settings = settings || {};
	const palette = getPalette(colorMode, colorAttr),
		paletteLength = palette.length;
	switch (colorMode) {
		case 'Categorical':
		case 'Stacked':
			return categoricalColorFactory(colorAttr, palette, paletteLength);
		case 'Heatmap':
		case 'Flame':
		case 'Icicle':
			return heatmapColorFactory(colorAttr, palette, paletteLength, settings);
		case 'Text':
		case 'Box':
		case 'Bar':
		default:
			return blackColor;
	}
}

function categoricalColorFactory(colorAttr, palette, paletteLength) {
	const { uniques } = colorAttr.colorIndices;
	const totalUniques = Math.max(colorAttr.uniques.length, 1);
	return (totalUniques < paletteLength) ?
		(
			(val) => {
				return palette[1 + (uniques[val] | 0)];
			}
		) :
		(
			(val) => {
				return palette[1 + (uniques[val] % (paletteLength - 1) | 0)];
			}
		);
}

function heatmapColorFactory(colorAttr, palette, paletteLength, settings) {
	let {
		min,
		max,
		clipMin,
		clipMax,
	} = clipRange(colorAttr, settings);
	const isZero = min === 0;

	if (min === max) {
		if (isZero) {
			const c = palette[0];
			return () => { return c; };
		} else {
			const c = palette[1];
			return () => { return c; };
		}
	}

	const clipDelta = (clipMax - clipMin) || 1;
	const maxColor = palette[palette.length - 1];
	if (isZero) { // zero-value is coloured differently
		const minColor = palette[0];
		const colorIdxScale = (palette.length - 1) / clipDelta;
		return settings.logScale ? (
			(val) => {
				val = logProject(val);
				if (val >= clipMax) {
					return maxColor;
				} else if (val <= clipMin) {
					return minColor;
				} else {
					const cIdx = ((val - clipMin) * colorIdxScale) | 0;
					return palette[cIdx];
				}
			}
		) : (
			(val) => {
				if (val >= clipMax) {
					return maxColor;
				} else if (val <= clipMin) {
					return minColor;
				} else {
					const cIdx = ((val - clipMin) * colorIdxScale) | 0;
					return palette[cIdx];
				}
			}
		);
	} else {
		// skip using special color for the zero-value for
		// data ranges that have negative values and/or
		// no zero value
		const minColor = palette[1];
		const colorIdxScale = (palette.length - 2) / clipDelta;
		return settings.logScale ? (
			(val) => {
				val = logProject(val);
				if (val >= clipMax) {
					return maxColor;
				} else if (val <= clipMin) {
					return minColor;
				} else {
					const cIdx = 1 + ((val - clipMin) * colorIdxScale) | 0;
					return palette[cIdx];
				}
			}
		) : (
			(val) => {
				if (val >= clipMax) {
					return maxColor;
				} else if (val < clipMin) {
					return minColor;
				} else {
					const cIdx = 1 + ((val - clipMin) * colorIdxScale) | 0;
					return palette[cIdx];
				}
			}
		);
	}
}


// The returned function is called inside an inner loop, which
// is why we have so much code duplication to avoid branching.
export function attrToColorIndexFactory(colorAttr, colorMode, settings) {
	const palette = getPalette(colorMode, colorAttr),
		paletteLength = palette.length;

	switch (colorMode) {
		case 'Categorical':
		case 'Stacked':
			return categoricalIndexFactory(colorAttr, paletteLength);
		case 'Heatmap':
		case 'Flame':
		case 'Icicle':
			return heatmapIndexFactory(colorAttr, colorMode, settings);
		case 'Text':
		case 'Bar':
		case 'Box':
		default:
			return blackColor;
	}
}

function categoricalIndexFactory(colorAttr, paletteLength) {
	const { uniques } = colorAttr.colorIndices;
	const totalUniques = Math.max(1, colorAttr.uniques.length);

	if (totalUniques > paletteLength) {
		return (
			(val) => {
				return 1 + (uniques[val] % (paletteLength - 1)) | 0;
			}
		);
	} else {
		return (
			(val) => {
				return 1 + uniques[val] | 0;
			}
		);

	}
}

function heatmapIndexFactory(colorAttr, colorMode, settings) {
	let {
		min,
		max,
		clipMin,
		clipMax,
	} = clipRange(colorAttr, settings);
	const isZero = min === 0;
	if (min === max) {
		if (isZero) {
			return indexZero;
		} else {
			return indexOne;
		}
	}

	const clipDelta = (clipMax - clipMin) || 1;
	const paletteEnd = getPalette(colorMode).length - 1;

	// zero-value is coloured differently
	if (isZero){
		const colorIdxScale = paletteEnd / clipDelta;
		if (settings.logScale){
			return (val) => {
				val = logProject(val);
				if (val >= clipMax) {
					return paletteEnd;
				} else if (val <= clipMin) {
					return 0;
				} else {
					return ((val - clipMin) * colorIdxScale) | 0;
				}
			};
		}
		return (val) => {
			if (val >= clipMax) {
				return paletteEnd;
			} else if (val <= clipMin) {
				return 0;
			} else {
				return ((val - clipMin) * colorIdxScale) | 0;
			}
		};
	}

	// skip using special color for the zero-value for
	// data ranges that have negative values and/or
	// no zero value
	const colorIdxScale = (paletteEnd - 1) / clipDelta;
	if (settings.logScale) {
		return (val) => {
			val = logProject(val);
			if (val >= clipMax) {
				return paletteEnd;
			} else if (val <= clipMin) {
				return 1;
			} else {
				return 1 + ((val - clipMin) * colorIdxScale) | 0;
			}
		};
	}
	return (val) => {
		if (val >= clipMax) {
			return paletteEnd;
		} else if (val <= clipMin) {
			return 1;
		} else {
			return 1 + ((val - clipMin) * colorIdxScale) | 0;
		}
	};
}

function indexZero() { return 0; }
function indexOne() { return 1; }