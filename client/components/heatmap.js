import L from 'leaflet';
import React, {PropTypes} from 'react';

export class Heatmap extends React.Component {

	componentDidMount() {
		const { zoomRange, fullZoomWidth, fullZoomHeight,
			dataset, project, heatmapState } = this.props.dataSet;

		L.Icon.Default.imagePath = '/static/img';
		const map = L.map(
			this.refs.mapContainer,
			{
				minZoom: zoomRange[0] + 1,
				maxZoom: zoomRange[2],
				crs: L.CRS.Simple,
				attributionControl: false,
			}
		);

		L.tileLayer(
			`/loom/${project}/${dataset}/tiles/{z}/{x}_{y}.png`,
			{
				minZoom: zoomRange[0] + 1,
				maxZoom: zoomRange[2],
				maxNativeZoom: zoomRange[2] - 8,
				continuousWorld: false,
				noWrap: true,
				attribution: '',
			}
		).addTo(map);

		const southWest = map.unproject([0, fullZoomHeight], map.getMaxZoom());
		const northEast = map.unproject([fullZoomWidth, 0], map.getMaxZoom());
		map.fitBounds(new L.LatLngBounds(southWest, northEast));
		const center = heatmapState.center ? heatmapState.center :
			L.latLng((southWest.lat + northEast.lat) * 0.5,
				(southWest.lng + northEast.lng) * 0.5);
		const zoom = heatmapState.zoom ? heatmapState.zoom : 8;
		map.setView(center, zoom);

		const handleViewChanged = () => {
			const bounds = map.getBounds();
			const dse = map.project(bounds.getSouthEast(), zoomRange[1]);
			const dnw = map.project(bounds.getNorthWest(), zoomRange[1]);
			const dataBounds = [dnw.x, dnw.y, dse.x, dse.y];
			const zoom = map.getZoom();
			const center = map.getCenter();
			this.props.onViewChanged({ dataBounds, zoom, center });
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
	dataSet: PropTypes.object.isRequired,
	onViewChanged: PropTypes.func.isRequired,
};
