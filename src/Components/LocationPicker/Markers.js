import React from 'react';
import PropTypes from 'prop-types';
import { Marker } from 'react-map-gl';



export default function Markers(props) {
  return <>
    {Object.keys(props.pastLocations).map(key => {
      const loc = props.pastLocations[key];
      const isSelected = loc.id === props.currentLocation.id;
          
      return (
        <Marker
          key={loc.address}
          longitude={loc.lng}
          latitude={loc.lat}
          onClick={(e) => props.onMarkerClick(e, loc)}
          style={{ zIndex: isSelected ? 2 : 1, top: -20 }}
        >
          <div
            className={isSelected ? 'loc-curr-marker' : 'loc-marker'}
            onMouseEnter={() => props.onMarkerMouseEnter({ ...loc, isSelected })}
            onMouseLeave={props.onMarkerMouseLeave}
            onContextMenu={() => props.onMarkerRightClick(loc, isSelected)}
          ></div>
        </Marker>
      );
    })}
  </>;
}

Markers.propTypes = {
  currentLocation: PropTypes.object,
  pastLocations: PropTypes.object,
  onMarkerMouseEnter: PropTypes.func,
  onMarkerMouseLeave: PropTypes.func,
  onMarkerClick: PropTypes.func,
  onMarkerRightClick: PropTypes.func
};