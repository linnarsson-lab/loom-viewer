import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { TypedArrayProp } from 'js/proptypes-typedarray';

import {
	Button,
} from 'react-bootstrap';

import { Canvas } from 'components/canvas';

import { sparkline } from 'plotters/sparkline';

import {
	AttrLegend,
	OverlayTooltip,
} from 'components/settings';


const defaultModes = [
	'Bars',
	'Box',
	'Heatmap',
	'Flame',
	'Icicle',
	'Categorical',
	'Stacked',
];


export class MetadataPlot extends Component {
	constructor(...args) {
		super(...args);

		this.modeCycler = this.modeCycler.bind(this);

		const modes = this.props.modes || defaultModes;
		let idx = modes.indexOf(this.props.mode);
		const mode = idx === -1 ?
			0 :
			idx;

		this.state = {
			modes,
			mode,
			paint: modes.map((mode) => {
				return sparkline(this.props.attr, this.props.indices, mode);
			}),
		};
	}

	modeCycler(){
		const mode = (this.state.mode + 1) % this.state.modes.length;
		this.setState(() => {
			return { mode };
		});
	}

	componentWillReceiveProps(nextProps){
		const {
			attr,
			indices,
		} = nextProps;
		const modes = nextProps.modes || defaultModes;
		if (this.props.indices !== indices){
			const newState = {
				paint: modes.map((mode) => {
					return sparkline(attr, indices, mode);
				}),
			};
			this.setState(() => {
				return newState;
			});
		}
	}

	render() {

		const {
			modes,
			mode,
			paint,
		} = this.state;

		const {
			attr,
			filterFunc,
			filteredAttrs,
		} = this.props;

		const buttonStyle = {
			cursor: modes.length > 1 ?
				'pointer' :
				'initial',
		};
		return (
			<div className='view-vertical'>
				<OverlayTooltip
					tooltip={`Click to cycle trough plot modes for "${attr.name}". Currently ${modes[mode]}`}
					tooltipId={`${attr.name.replace(/\s+/g, '-').toLowerCase()}-plt-tltp`}>
					<Button
						onClick={this.modeCycler}
						bsStyle='link'
						style={buttonStyle} >
						<Canvas
							height={80}
							paint={paint[mode]}
							ignoreResize />
					</Button>
				</OverlayTooltip>
				<AttrLegend
					mode={modes[mode]}
					filterFunc={filterFunc}
					attr={attr}
					filteredAttrs={filteredAttrs}
				/>
			</div>
		);
	}
}

MetadataPlot.propTypes = {
	attr: PropTypes.object.isRequired,
	indices: TypedArrayProp.any,
	mode: PropTypes.string,
	modes: PropTypes.arrayOf(PropTypes.string),
	filteredAttrs: PropTypes.array.isRequired,
	filterFunc: PropTypes.func.isRequired,
};