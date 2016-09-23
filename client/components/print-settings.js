import React, { PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
import { ListGroupItem, Glyphicon,
	Button, ButtonGroup } from 'react-bootstrap';
import { merge } from '../js/util';

// Since print settings are pretty much equivalent across side-panels, make one component for them
export const PrintSettings = function (props) {
	const { dispatch, dataSet, stateName, actionType } = props;
	const state = dataSet[stateName];
	const { printSettings } = state;
	const handleChangeFactory = (field) => {
		return (value) => {
			dispatch({
				type: actionType,
				datasetName: dataSet.dataset,
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
			onClick={ () => { printMenuProps.onChange(!showPrint); } }
			>
			<Glyphicon glyph='option-vertical' /> Export image
		</Button>
	);

	let orientationMenu, exportTargetMenu, printSizeMenu, dpiMenu, pixelSizeMenu, saveMenu;
	if (showPrint) {
		const orientationProps = menuProps('orientation');
		orientationMenu = (
			<div>
				<label>Orientation</label>
				<DropdownMenu
					options={['Portrait', 'Landscape']}
					onChange={orientationProps.onChange}
					value={orientationProps.value}
					unsorted
					/>
			</div>
		);

		const exportTargetProps = menuProps('exportTarget');
		exportTargetMenu = (
			<div>
				<label>Export target</label>
				<DropdownMenu
					options={['Print', 'Screen']}
					onChange={exportTargetProps.onChange}
					value={exportTargetProps.value}
					unsorted
					/>
			</div>
		);

		if (exportTargetProps.value === 'Print') {
			const printSizeProps = menuProps('printSize');
			printSizeMenu = (
				<div>
					<label>Print size</label>
					<DropdownMenu
						options={['A4', 'US Letter']}
						onChange={printSizeProps.onChange}
						value={printSizeProps.value}
						unsorted
						/>
				</div>
			);
			const dpiProps = menuProps('DPI');
			dpiMenu = (
				<div>
					<label>DPI</label>
					<DropdownMenu
						options={[72, 144, 300]}
						onChange={dpiProps.onChange}
						value={dpiProps.value}
						unsorted
						/>
				</div>
			);
		} else {
			const pixelSizeProps = menuProps('pixelSize');
			pixelSizeMenu = (
				<div>
					<label>Pixel dimensions</label>
					<DropdownMenu
						options={['640x480', '800x600', '1024x768', '1280x720', '1920x1080', '3840x2160 (4K)', '7680x4320 (8K)']}
						onChange={pixelSizeProps.onChange}
						value={pixelSizeProps.value}
						unsorted
						/>
				</div>
			);
		}

		saveMenu = (
			<div>
				<label>Save as: </label><br />
				<ButtonGroup>
					<Button bsStyle='danger' >
						<Glyphicon glyph='floppy-disk' />PNG
					</Button>
					<Button bsStyle='danger'>
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
				{orientationMenu}
				{exportTargetMenu}
				{printSizeMenu}
				{dpiMenu}
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
};

export const defaultPrintSettings = {
	showPrintMenu: false,
	orientation: 'Portrait',
	exportTarget: 'Print',
	printSize: 'A4',
	DPI: '300',
	pixelSize: '1280x720',
};

