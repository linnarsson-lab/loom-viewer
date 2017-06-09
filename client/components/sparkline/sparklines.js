import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { TypedArrayProp } from '../../js/proptypes-typedarray';

import { Canvas } from '../canvas';

import { sparkline } from '../../plotters/sparkline';

import { isEqual } from 'lodash';

const sparklineHeight = 40;

function nullfunc(){}

class Legend extends PureComponent {

	shouldComponentUpdate(nextProps) {
		return (
			this.props.colAttr !== nextProps.colAttr ||
			this.props.colMode !== nextProps.colMode ||
			nextProps.indicesChanged
		);
	}

	render() {
		const {
			width,
			height,
			col,
			colAttr,
			colMode,
			indices,
		} = this.props;
		const data = col.attrs[colAttr];

		const label = data ? data.name : null;
		const painter = data ? sparkline(data, indices, colMode, null, label) : nullfunc;

		return (
			<div style={{
				flex: '0 0 auto',
				overflowY: 'scroll',
				overflowX: 'hidden',
				height: `${height}px`,
				minHeight: `${height}px`,
				maxHeight: `${height}px`,
				minWidth: `${width}px`,
				maxWidth: `${width}px`,
				width: `${width}px`,
			}}>
				<Canvas
					width={width - 20}
					height={height}
					paint={painter}
					redraw
					clear
				/>
			</div>
		);
	}
}

Legend.propTypes = {
	height: PropTypes.number.isRequired,
	width: PropTypes.number.isRequired,
	col: PropTypes.object.isRequired,
	colAttr: PropTypes.string,
	colMode: PropTypes.string.isRequired,
	path: PropTypes.string.isRequired,
	indices: TypedArrayProp.any,
	indicesChanged: PropTypes.bool.isRequired,
};




export class Sparkline extends PureComponent {

	shouldComponentUpdate(nextProps) {
		// let gene = this.props.gene !== nextProps.gene,
		// 	indices = this.props.order !== nextProps.order,
		// 	mode = this.props.geneMode !== nextProps.geneMode,
		// 	label = this.props.showLabels !== nextProps.showLabels,
		// 	data = this.props.geneData === undefined && (this.props.geneData !== nextProps.geneData);

		return this.props.gene !== nextProps.gene ||
			this.props.geneMode !== nextProps.geneMode ||
			this.props.settings !== nextProps.settings ||
			this.props.showLabels !== nextProps.showLabels ||
			nextProps.indicesChanged ||
			(this.props.geneData === undefined &&
				nextProps.geneData !== undefined);
	}

	render() {
		const { gene, geneData, indices, geneMode, settings, showLabels, style } = this.props;
		const label = showLabels ? gene : null;
		return (
			<div style={style}>
				<Canvas
					height={sparklineHeight}
					paint={sparkline(geneData, indices, geneMode, settings, label)}
					redraw
					clear
				/>
			</div>
		);
	}
}

Sparkline.propTypes = {
	gene: PropTypes.string,
	geneData: PropTypes.object,
	geneMode: PropTypes.string,
	indicesChanged: PropTypes.bool,
	settings: PropTypes.object.isRequired,
	showLabels: PropTypes.bool.isRequired,
	indices: TypedArrayProp.any,
	style: PropTypes.object,
};

export class Sparklines extends PureComponent {
	shouldComponentUpdate(nextProps) {
		// attrs object changes, so we check if
		// the objects contained are different
		return this.props.selection !== nextProps.selection ||
			this.props.geneMode !== nextProps.geneMode ||
			this.props.showLabels !== nextProps.showLabels ||
			this.props.settings !== nextProps.settings ||
			nextProps.indicesChanged ||
			!isEqual(this.props.attrs, nextProps.attrs);
	}

	render() {
		const {
			attrs,
			selection,
			indices,
			indicesChanged,
			geneMode,
			settings,
			containerWidth,
			showLabels,
		} = this.props;

		let sparklines = [];
		for (let i = 0; i < selection.length; i++) {
			let gene = selection[i];
			let geneData = attrs[gene];
			sparklines.push(
				<Sparkline
					key={gene}
					gene={gene}
					geneData={geneData}
					geneMode={geneMode}
					indicesChanged={indicesChanged}
					indices={indices}
					settings={settings}
					showLabels={showLabels}
					style={{
						background: ((i % 2 === 0) ? '#FFFFFF' : '#F8F8F8'),
						minHeight: `${sparklineHeight}px`,
						maxHeight: `${sparklineHeight}px`,
						minWidth: `${containerWidth - 20}px`,
						maxWidth: `${containerWidth - 20}px`,
					}}
				/>
			);
		}
		return (
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					minWidth: `${containerWidth - 20}px`,
					maxWidth: `${containerWidth - 20}px`,
					height: `${Math.max(200, selection.length * sparklineHeight)}px`,
				}}>
				{sparklines.length ? sparklines : (
					<div className='view centered'>
						<span>Select genes to display sparklines</span>
					</div>
				)}
			</div>
		);
	}
}


Sparklines.propTypes = {
	containerWidth: PropTypes.number.isRequired,
	attrs: PropTypes.object,
	selection: PropTypes.arrayOf(PropTypes.string),
	indices: TypedArrayProp.any,
	indicesChanged: PropTypes.bool,
	geneMode: PropTypes.string,
	settings: PropTypes.object.isRequired,
	showLabels: PropTypes.bool.isRequired,
};

export class SparklineList extends PureComponent {
	componentWillMount() {
		this.setState({ mounted: false });
	}

	componentDidMount() {
		this.setState({ mounted: true });
	}

	render() {
		if (this.state.mounted) {
			const {
				col,
				colAttr,
				colMode,
				path,
				attrs,
				selection,
				indices,
				indicesChanged,
				geneMode,
				showLabels,
				settings,
			} = this.props;

			const el = this.refs.sparklineContainer;
			const containerWidth = el.clientWidth - 20;
			const containerHeight = el.clientHeight - 20;
			const legendHeight = 60;

			return (
				<div
					className='view-vertical'
					style={{
						overflowX: 'hidden',
						overFloxY: 'hidden',
						minHeight: 0,
					}}
					ref='sparklineContainer'>
					<Legend
						height={legendHeight}
						width={containerWidth}
						col={col}
						colAttr={colAttr}
						colMode={colMode}
						indices={indices}
						path={path}
						indicesChanged={indicesChanged}
					/>
					<div
						style={{
							display: 'flex',
							flex: '0 0 auto',
							minWidth: `${containerWidth}px`,
							maxWidth: `${containerWidth}px`,
							minHeight: `${containerHeight - legendHeight}px`,
							maxHeight: `${containerHeight - legendHeight}px`,
							overflowX: 'hidden',
							overflowY: 'scroll',
						}}>
						<Sparklines
							attrs={attrs}
							selection={selection}
							indices={indices}
							indicesChanged={indicesChanged}
							settings={settings}
							geneMode={geneMode}
							showLabels={showLabels}
							containerWidth={containerWidth}
						/>
					</div>
				</div >
			);
		}
		else {
			return (
				<div className='view centered' ref='sparklineContainer'>
					Initialising sparklines
				</div>
			);
		}
	}
}

SparklineList.propTypes = {
	attrs: PropTypes.object,
	selection: PropTypes.arrayOf(PropTypes.string),
	indices: TypedArrayProp.any,
	indicesChanged: PropTypes.bool,
	geneMode: PropTypes.string,
	settings: PropTypes.object.isRequired,
	showLabels: PropTypes.bool.isRequired,
	col: PropTypes.object.isRequired,
	colAttr: PropTypes.string,
	colMode: PropTypes.string.isRequired,
	path: PropTypes.string.isRequired,
};