import L from 'leaflet';
import React, {PropTypes} from 'react';

export class Heatmap extends React.Component {
	constructor(props) {
		super(props);
	}

	handleViewChanged(map) {
		let bounds = map.getBounds();
		const sb = map.getPixelBounds();
		const dse = map.project(bounds.getSouthEast(), this.props.zoomRange[1]);
		const dnw = map.project(bounds.getNorthWest(), this.props.zoomRange[1]);

		const screenOrigin = {
			x: Math.max(0, -sb.min.x),
			y: Math.max(0, -sb.min.y),
		};

		const dataBounds = [
			Math.max(0, dnw.x),
			Math.max(0, dnw.y),
			Math.min(dse.x, this.props.shape[1]),
			Math.min(dse.y, this.props.shape[0]),
		];

		const units = dnw.x / sb.min.x;
		const screenBounds = [
			screenOrigin.x,
			screenOrigin.y,
			Math.round((dataBounds[2] - dataBounds[0]) / units) + screenOrigin.x,
			Math.round((dataBounds[3] - dataBounds[1]) / units) + screenOrigin.y,
		];

		bounds = {
			screenBounds: screenBounds,
			dataBounds: dataBounds,
			zoom: map.getZoom(),
			center: map.getCenter(),
		};
		this.props.onViewChanged(bounds);
	}

	componentDidMount() {
		L.Icon.Default.imagePath = '/static/img';
		const map = L.map(
			this.refs.map,
			{
				maxZoom: this.props.zoomRange[2],
				minZoom: this.props.zoomRange[0] + 1,
				crs: L.CRS.Simple,
				attributionControl: false,
			}
		);

		L.tileLayer(
			`/loom/${this.props.project}/${this.props.dataset}/tiles/{z}/{x}_{y}.png`,
			{
				maxZoom: this.props.zoomRange[2],
				minZoom: this.props.zoomRange[0] + 1,
				continuousWorld: false,
				noWrap: true,
				attribution: '',
			}
		).addTo(map);

		this.setState({ map });
		const southWest = map.unproject([0, this.props.fullZoomHeight], map.getMaxZoom());
		const northEast = map.unproject([this.props.fullZoomWidth, 0], map.getMaxZoom());
		map.on('move', () => { return this.handleViewChanged(map); });
		if (this.props.center.lat === 0 && this.props.center.lng === 0) {
			map.fitBounds(new L.LatLngBounds(southWest, northEast));
		} else {
			map.setView(this.props.center, this.props.zoom);
		}
		this.handleViewChanged(map);
	}

	componentDidUpdate() {
	}

	componentWillUnmount() {
		const map = this.state['map'];
		map.off('move', this.handleViewChanged);
	}

	render() {
		const heatmapStyle = {
			// width: this.props.width + "px",
			// height: this.props.height + "px",
		};
		return (
			<div
				ref='map'
				className='view'
				style={heatmapStyle}
				/>
		);
	}
}

Heatmap.propTypes = {
	transcriptome: PropTypes.string.isRequired,
	project: PropTypes.string.isRequired,
	dataset: PropTypes.string.isRequired,
	width: PropTypes.number.isRequired,
	height: PropTypes.number.isRequired,
	zoom: PropTypes.number.isRequired,
	center: PropTypes.object.isRequired,
	shape: PropTypes.arrayOf(PropTypes.number).isRequired,
	zoomRange: PropTypes.arrayOf(PropTypes.number).isRequired,
	fullZoomWidth: PropTypes.number.isRequired,
	fullZoomHeight: PropTypes.number.isRequired,
	onViewChanged: PropTypes.func.isRequired,
};
