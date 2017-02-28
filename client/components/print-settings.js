import React, { PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
import {
	ListGroupItem, Glyphicon,
	Button, ButtonGroup
} from 'react-bootstrap';
import { merge } from '../js/util';

// Since print settings are pretty much equivalent across side-panels, make one component for them
export const PrintSettings = function (props) {
	const { dispatch, dataSet, stateName, actionType, sketches } = props;
	const state = dataSet[stateName];
	const { printSettings } = state;
	const handleChangeFactory = (field) => {
		return (value) => {
			dispatch({
				type: actionType,
				path: dataset.path,
				[stateName]: merge(
					state,
					{
						printSettings: merge(
							printSettings,
							{ [field]: value }
						),
					}
				),
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
			onClick={() => { printMenuProps.onChange(!showPrint); } }
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
				<ButtonGroup>
					<Button bsStyle='danger' onClick={savePNG} >
						<Glyphicon glyph='floppy-disk' />PNG
					</Button>
					<Button bsStyle='danger' onClick={saveSVG} >
						<Glyphicon glyph='floppy-disk' />SVG
					</Button>
				</ButtonGroup>
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
};

PrintSettings.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataSet: PropTypes.object.isRequired,
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

function generateExportRenderFuncs(exportTarget, printSize, dpi, pixelSize, orientation, sketches) {
			// - create (mock) canvas element at proper dimensions
	// - render plot
	//   - Print sketches in order from top to bottom
	//   - Auto-pagebreak based on height of sketches
	// - save plot

	// determine canvasSize & scaling sketches appropriately
	let cwidth = 100;
	let cheight = 100;
	let pixelRatio = 1;
	if (exportTarget === 'Print') {

		// 75 dpi ~= 30 dots/cm. We take that as the default.
		switch (printSize) {
			case 'A4':
				cwidth = 620;
				cheight = 877;
				break;
			case 'US Letter':
				cwidth = 638;
				cheight = 825;
				break;
		}

		//Using 75 DPI as pixelRatio 1, we scale for 150 and 300 DPI
		pixelRatio = dpi / 75;
		cwidth *= pixelRatio;
		cheight *= pixelRatio;

	} else {
		switch (pixelSize) {
			case '640x480':
				cwidth = 640;
				cheight = 480;
				pixelRatio = 0.5;
				break;
			case '800x600':
				cwidth = 800;
				cheight = 6000;
				pixelRatio = 0.5;
				break;
			case '1024x768':
				cwidth = 1024;
				cheight = 768;
				pixelRatio = 1;
				break;
			case '1280x720':
				cwidth = 1280;
				cheight = 720;
				pixelRatio = 1;
				break;
			case '1920x1080':
				cwidth = 1920;
				cheight = 1080;
				pixelRatio = 2;
				break;
			case '3840x2160 (4K)':
				cwidth = 3840;
				cheight = 2160;
				pixelRatio = 4;
				break;
			case '7680x4320 (8K)':
				cwidth = 7680;
				cheight = 4320;
				pixelRatio = 8;
				break;
		}
	}

	if (orientation === 'Landscape') {
		let t = cwidth;
		cwidth = cheight;
		cheight = t;
	}

	// Determining layout of the sketches. We place them below each other,
	// page break if we run out of space. If they're too big to fit we clip.
	// page break is implemented as creating a fresh context and saving each
	// page separately.
	// for (let i = 0; i < sketches.length; i++){
	// 	let pages = [];
	// 	let y = 0;

	// }

	const saveSVG = () => { };
	const savePNG = () => { };
	return { savePNG, saveSVG };
}

