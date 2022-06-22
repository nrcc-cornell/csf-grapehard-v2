import React, { useState } from 'react';
import PropTypes from 'prop-types';

import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import Map, { Popup } from 'react-map-gl';

import Markers from './Markers';


// Takes a number or string to round and a number for digits to round to, returns a rounded number
function roundXDigits( number, digits ) {
  if (typeof number === 'string') {
    number = parseFloat(number);
  }
  
  const res = (Math.round( Math.round( number * Math.pow(10, digits + 1) ) / 10 ) / Math.pow(10, digits)).toFixed(digits);
  
  return parseFloat(res);
}

// Determines if user device is a touchscreen device, returns boolean
function isTouchDevice() {
  return (('ontouchstart' in window) ||
     (navigator.maxTouchPoints > 0));
}

// Gets the address name for a set of coordinates if it is within the list of allowed states
function getLocation( lng, lat, token, states ) {
  return fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?limit=1&access_token=${token}`, { method: 'GET' })
    .then(response => response.json())
    .then((res) => {
      // Gets the state name
      const region = res.features[0].context.find((c) => c.id.split('.')[0] === 'region');
      
      // If no state name or state is outside scope, reject it
      if (states && !states.includes(region.text)) throw new Error('Out of Bounds');

      // Construct user friendly address
      const address = res.features[0].place_name.replace(', United States', '').replace(/\s\d{5}/g, '');

      return {
        address,
        lng,
        lat
      };
    })
    .catch(() => false);
}

// Uses all past locations to find the bounding coordinates for the initial map view
function calcInitBounds(locations) {
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  Object.values(locations).forEach(loc => {
    if (loc.lat > maxLat) maxLat = loc.lat;
    if (loc.lat < minLat) minLat = loc.lat;
    if (loc.lng > maxLng) maxLng = loc.lng;
    if (loc.lng < minLng) minLng = loc.lng;
  });


  // If only one location is present, adjust the coordinates to reduce initial zoom
  const adjustment = 0.1;
  if (minLat === maxLat) {
    minLat -= adjustment;
    maxLat += adjustment;
  }

  if (minLng === maxLng) {
    minLng -= adjustment;
    maxLng += adjustment;
  }

  return [minLng, minLat, maxLng, maxLat];
}



export default function MapComp(props) {
  // Set token for mapbox API
  mapboxgl.accessToken = props.token;

  const [popup, setPopup] = useState(null);
  const [viewState, setViewState] = useState({
    bounds: calcInitBounds(props.pastLocations),
    fitBoundsOptions: {
      padding: {
        top: 100,
        bottom: 10,
        left: 15,
        right: 15
      }
    }
  });


  // Limits panning to bbox coordinates
  const handlePanning = (view) => {
    if (view.latitude > props.bbox.north || view.latitude < props.bbox.south) {
      view.latitude = viewState.latitude;
    }

    if (view.longitude > props.bbox.east || view.longitude < props.bbox.west) {
      view.longitude = viewState.longitude;
    }

    setViewState(prev => {
      return {
        ...prev,
        ...view
      };
    });
  };

  // Changes selected location
  const handleMarkerClick = (e, loc) => {
    e.originalEvent.stopPropagation();
    props.handleChangeLocations('change', loc);
  };

  // Removes locations
  const handleMarkerRightClick = (loc, isSelected) => {
    if (!isSelected) {
      props.handleChangeLocations('remove', loc);
      setPopup(null);
    }
  };

  // Opens popup for location on hover
  const handleMarkerMouseEnter = (newContent) => {
    setPopup(newContent);
  };

  // Closes popup for location
  const handleMarkerMouseLeave = () => {
    setPopup(null);
  };

  // Gets new location information on map click if the clicked location is within given bbox and state list
  const handleMapClick = async (e) => {
    const lng = e.lngLat.lng;
    const lat = e.lngLat.lat;

    if (lng >= props.bbox.west && lng <= props.bbox.east && lat >= props.bbox.south && lat <= props.bbox.north) {
      const newLocation = await getLocation(lng, lat, props.token, props.allowedStates);
  
      if (newLocation && props.mapRef.current) {
        props.handleChangeLocations('add', newLocation);
        props.mapRef.current.flyTo({
          center: [newLocation.lng, newLocation.lat],
          speed: 0.8,
          essential: true
        });
      }
    }
  };


  return (
    <div id='loc-map'>
      <Map
        {...viewState}
        ref={props.mapRef}
        mapStyle='mapbox://styles/mapbox/satellite-streets-v11'
        boxZoom={false}
        dragRotate={false}
        touchPitch={false}
        doubleClickZoom={false}
        attributionControl={false}
        onMove={evt => handlePanning(evt.viewState)}
        onClick={handleMapClick}
      >
        <Markers
          currentLocation={props.currentLocation}
          pastLocations={props.pastLocations}
          onMarkerMouseEnter={handleMarkerMouseEnter}
          onMarkerMouseLeave={handleMarkerMouseLeave}
          onMarkerClick={handleMarkerClick}
          onMarkerRightClick={handleMarkerRightClick}
        />

        {
          popup && <Popup
            longitude={popup.lng}
            latitude={popup.lat}
            closeOnClick={false}
            closeButton={false}
            onClose={() => setPopup(null)}
            offset={{
              'center': [0, 0],
              'left': [12, 0],
              'right': [-12, 0],
              'top': [0, -6],
              'top-left': [10, 3],
              'top-right': [-20, 3],
              'bottom': [0, -16],
              'bottom-left': [10, -12],
              'bottom-right' : [-20, -12]
            }}
            style={{ zIndex: 4 }}
          >
            <h3>{popup.address}</h3>
            <h4>Coordinates: {roundXDigits(popup.lng, 5)}, {roundXDigits(popup.lat, 5)}</h4>
            {
              popup.isSelected ? '' : <>
                <h5>Click to Use</h5>
                {isTouchDevice() ? 
                  <h5>Click and Hold to Remove</h5>
                  :
                  <h5>Right Click to Remove</h5>
                }
              </>
            }
          </Popup>
        }
      </Map>
    </div>
  );
}

MapComp.propTypes = {
  allowedStates: PropTypes.array,
  bbox: PropTypes.object,
  token: PropTypes.string,
  handleChangeLocations: PropTypes.func,
  currentLocation: PropTypes.object,
  pastLocations: PropTypes.object,
  mapRef: PropTypes.object
};