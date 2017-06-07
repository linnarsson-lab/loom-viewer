import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
	ListGroupItem,
	Glyphicon,
	Button,
	ButtonGroup,
} from 'react-bootstrap';

import { DropdownMenu } from './dropdown';

import { merge } from '../../js/util';

function makeCanvas(width, height) {
	let c = document.createElement('canvas');
	c.id = `print_canvas_${width}_${height}`;
	c.width = width;
	c.height = height;
	return c;
}

const printCanvas = (() => {
	return {
		Print: {
			A4: {
				low: makeCanvas(595, 842), //72DPI
				med: makeCanvas(1190, 1684), //144DPI
				high: makeCanvas(2480, 3508), //300DPI
			},
			US: {
				low: makeCanvas(612, 792), //72DPI
				med: makeCanvas(1224, 1584), //144DPI
				high: makeCanvas(2550, 3300), //300DPI
			},
		},
		Screen: {
			low: makeCanvas(640, 480),
			med: makeCanvas(1280, 720),
			high: makeCanvas(1920, 1080),
		},
	};
})();

// Since print settings are pretty much equivalent across side-panels,
// make one component for them. Print settings are not saved in redux
export class PrintSettings extends PureComponent {
	render() {
		const { dataset, stateName, actionType, sketches } = this.props;
		const state = dataset[stateName];
		const { printSettings } = state;
		const handleChangeFactory = (field) => {
			return (value) => {
				const printSettings = merge(printSettings, { [field]: value });
				const newState = merge(state, { printSettings });
				dispatch({
					type: actionType,
					path: dataset.path,
					viewState: { [stateName]: newState },
				});
			};
		};

		const retreiveValue = (field) => {
			if (state && state.printSettings) {
				return state.printSettings[field];
			}
		};

		const menuProps = (field) => {
			return {
				onChange: handleChangeFactory(field),
				value: retreiveValue(field),
			};
		};

		const printMenuProps = menuProps('showPrintMenu');
		const showPrint = printMenuProps.value;
		const showPrintMenu = (
			<Button
				bsStyle={showPrint ? 'primary' : 'default'}
				onClick={() => { printMenuProps.onChange(!showPrint); }}
			>
				Export image
		</Button>
		);

		let orientationMenu, exportTargetMenu, printSizeMenu, dpiMenu, pixelSizeMenu, saveMenu;

		if (showPrint) {

			const exportTargetOptions = ['Print', 'Screen'];
			const exportTargetProps = menuProps('exportTarget', exportTargetOptions);
			exportTargetMenu = (
				<div>
					<label>Export target</label>
					<DropdownMenu
						options={exportTargetOptions}
						onChange={exportTargetProps.onChange}
						value={exportTargetProps.value}
					/>
				</div>
			);

			if (exportTargetProps.value === 'Print') {
				const printSizeOptions = ['A4', 'US Letter'];
				var printSizeProps = menuProps('printSize');
				printSizeMenu = (
					<div>
						<label>Print size</label>
						<DropdownMenu
							options={printSizeOptions}
							onChange={printSizeProps.onChange}
							value={printSizeProps.value}
						/>
					</div>
				);
				const dpiOptions = [75, 150, 300];
				var dpiProps = menuProps('DPI');
				dpiMenu = (
					<div>
						<label>DPI</label>
						<DropdownMenu
							options={dpiOptions}
							onChange={dpiProps.onChange}
							value={dpiProps.value}
						/>
					</div>
				);
				const orientationOptions = ['Portrait', 'Landscape'];
				var orientationProps = menuProps('orientation');
				orientationMenu = (
					<div>
						<label>Orientation</label>
						<DropdownMenu
							options={orientationOptions}
							onChange={orientationProps.onChange}
							value={orientationProps.value}
						/>
					</div>
				);
			} else {
				const pixelSizeOptions = ['640x480', '800x600', '1024x768',
					'1280x720', '1920x1080', '3840x2160 (4K)', '7680x4320 (8K)'];
				var pixelSizeProps = menuProps('pixelSize');
				pixelSizeMenu = (
					<div>
						<label>Pixel dimensions</label>
						<DropdownMenu
							options={pixelSizeOptions}
							onChange={pixelSizeProps.onChange}
							value={pixelSizeProps.value}
						/>
					</div>
				);
			}

			const { savePNG, saveSVG } = generateExportRenderFuncs(
				exportTargetProps.value,
				printSizeProps.value,
				dpiProps.value,
				pixelSizeProps.value,
				orientationProps.value,
				sketches);
			saveMenu = (
				<div>
					<label>Save as: </label><br />
					<Button bsStyle='danger' onClick={savePNG} >
						<Glyphicon glyph='floppy-disk' />
					</Button>
				</div>
			);
		}


		return (
			<ListGroupItem>
				{showPrintMenu}
				<div style={{ marginLeft: '2em' }} >
					{exportTargetMenu}
					{printSizeMenu}
					{dpiMenu}
					{orientationMenu}
					{pixelSizeMenu}
					{saveMenu}
				</div>
			</ListGroupItem>
		);
	}
}

PrintSettings.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	stateName: PropTypes.string.isRequired,
	actionType: PropTypes.string.isRequired,
	sketches: PropTypes.arrayOf(PropTypes.shape({
		paint: PropTypes.func.isRequired,
		width: PropTypes.number,
		height: PropTypes.number,
	})).isRequired,
};

export const defaultPrintSettings = {
	showPrintMenu: false,
	orientation: 'Portrait',
	exportTarget: 'Print',
	printSize: 'A4',
	DPI: '300',
	pixelSize: '1280x720',
};