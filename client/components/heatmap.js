import L from 'leaflet';
import React, {PropTypes} from 'react';

export class Heatmap extends React.Component {

	componentDidMount() {
		L.Icon.Default.imagePath = '/static/img';
		const map = L.map(
			this.refs.mapContainer,
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

		const southWest = map.unproject([0, this.props.fullZoomHeight], map.getMaxZoom());
		const northEast = map.unproject([this.props.fullZoomWidth, 0], map.getMaxZoom());
		map.fitBounds(new L.LatLngBounds(southWest, northEast));
		const center = L.latLng(0, 0);
		const zoom = 8;
		map.setView(center, zoom);

		const handleViewChanged = () => {
			const bounds = map.getBounds();
			const dse = map.project(bounds.getSouthEast(), this.props.zoomRange[1]);
			const dnw = map.project(bounds.getNorthWest(), this.props.zoomRange[1]);
			const dataBounds = [dnw.x, dnw.y, dse.x, dse.y];
			this.props.onViewChanged(dataBounds);
		};

		handleViewChanged();
		map.on('move', handleViewChanged);
		this.setState({ map, handleViewChanged });
	}

	componentWillUnmount() {
		const { map, handleViewChanged } = this.state;
		map.off('move', handleViewChanged);
	}

	render() {
		return (
			<div ref='mapContainer' className='view' />
		);
	}
}

Heatmap.propTypes = {
	transcriptome: PropTypes.string.isRequired,
	project: PropTypes.string.isRequired,
	dataset: PropTypes.string.isRequired,
	shape: PropTypes.arrayOf(PropTypes.number).isRequired,
	zoomRange: PropTypes.arrayOf(PropTypes.number).isRequired,
	fullZoomWidth: PropTypes.number.isRequired,
	fullZoomHeight: PropTypes.number.isRequired,
	onViewChanged: PropTypes.func.isRequired,
};
