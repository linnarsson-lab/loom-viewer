import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { TypedArrayProp } from '../../js/proptypes-typedarray';

import { Canvas } from '../canvas';

import { groupedSparkline } from '../../plotters/grouped-sparkline';

const sparklineHeight = 40;

function nullfunc() { }

class Legend extends PureComponent {
	render() {
		const {
			width,
			height,
			col,
			colAttr,
			colMode,
			sparkline,
		} = this.props;
		const data = col.attrs[colAttr];

		const label = data ? data.name : null;
		const painter = data ? sparkline(data, colMode, null, label, true) : nullfunc;

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
	sparkline: PropTypes.func.isRequired,
	height: PropTypes.number.isRequired,
	width: PropTypes.number.isRequired,
	col: PropTypes.object.isRequired,
	colAttr: PropTypes.string,
	colMode: PropTypes.string.isRequired,
	path: PropTypes.string.isRequired,
	indicesChanged: PropTypes.bool.isRequired,
};




export class Sparkline extends PureComponent {
	render() {
		const {
			sparkline,
			gene,
			geneData,
			geneMode,
			settings,
			showLabels,
			style,
		} = this.props;

		const label = showLabels ? gene : null;

		return (
			<div style={style} key={gene}>
				<Canvas
					height={sparklineHeight}
					paint={sparkline(geneData, geneMode, settings, label)}
					redraw
					clear
				/>
			</div>
		);
	}
}

Sparkline.propTypes = {
	sparkline: PropTypes.func.isRequired,
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

	render() {
		const {
			sparkline,
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
					sparkline={sparkline}
					gene={gene}
					geneData={geneData}
					geneMode={geneMode}
					indicesChanged={indicesChanged}
					indices={indices}
					settings={settings}
					showLabels={showLabels}
					style={{
						background: ((i % 2 === 0) ? '#F4F4F4' : '#FCFCFC'),
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
					<div className='view centred'>
						<span>Select genes to display sparklines</span>
					</div>
				)}
			</div>
		);
	}
}


Sparklines.propTypes = {
	sparkline: PropTypes.func.isRequired,
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
		this.sparklineContainer = this.sparklineContainer.bind(this);
		const { attrs, groupAttr, indices } = this.props;
		const sparkline = groupedSparkline(indices, attrs[groupAttr]);
		this.setState({
			sparkline,
		});
	}


	sparklineContainer(div){
		this.setState({ sparklineContainer: div });
	}

	componentWillUpdate(nextProps) {
		const { indices, attrs, groupAttr } = nextProps;
		if (groupAttr !== this.props.groupAttr ||
			indices !== this.props.indices) {
			this.setState({
				sparkline: groupedSparkline(indices, attrs[groupAttr]),
			});
		}
	}

	render() {
		const el = this.state.sparklineContainer;
		if (el) {
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

			const { sparkline } = this.state;

			const containerWidth = el.clientWidth - 20;
			const containerHeight = el.clientHeight - 20;
			const legendHeight = 60;

			return (
				<div
					className='view-vertical'
					style={{
						overflowX: 'hidden',
						overflowY: 'hidden',
						minHeight: 0,
					}}
					ref={this.sparklineContainer}>
					<Legend
						sparkline={sparkline}
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
							sparkline={sparkline}
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
				<div className='view centred' ref={this.sparklineContainer}>
					Initialising sparklines
				</div>
			);
		}
	}
}

SparklineList.propTypes = {
	attrs: PropTypes.object,
	selection: PropTypes.arrayOf(PropTypes.string),
	groupAttr: PropTypes.string,
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