import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './LocationPicker.css';

import Map from './Map';
import MapBar from './MapBar';

const defaultBBox = {
  north: 47.53,
  south: 37.09,
  east: -66.89,
  west: -82.7542
};

const defaultId = 'default';
const defaultLocation = {
  'default': {
    address: '213 Warren Road, Ithaca, New York',
    id: 'default',
    lat: 42.457975,
    lng: -76.46754
  }
};



export default function LocationPicker(props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [height, setHeight] = useState(0);
  
  // Use the passed in selected and locations props, otherwise uses the defaults
  const [pastLocations, setPastLocations] = useState(Object.keys(props.locations).length > 0 ? props.locations : defaultLocation);
  const [currentId, setCurrentId] = useState(props.selected || defaultId);

  const mapRef = useRef(null);


  // Handles moving the modal div to allow and disable clicking on the main page
  useEffect(() => {
    if (modalOpen === true) {
      setHeight('100vh');
    } else if (modalOpen === false) {
      setTimeout(() => {
        setHeight(0);
      }, 400);
    }
  }, [modalOpen]);

  const closeModal = () => {
    props.newLocationsCallback(currentId, pastLocations);
    setModalOpen(false);
  };


  // Main function for managing locations in state
  const handleChangeLocations = (action, location) => {
    // Adds timestamp ID to location object and adds it to state
    if (action === 'add') {
      location.id = String(Date.now());
      setPastLocations(prev => {
        return { ...prev, [location.id]: { ...location, id: location.id} };
      });
    }

    // Removes given location object from state
    if (action === 'remove') {
      setPastLocations(prev => {
        const newLocs = {...prev};
        delete newLocs[location.id];
        return newLocs;
      });
    }

    // Handles changing the current location selected in state
    if (action === 'add' || action === 'change') {
      setCurrentId(location.id);
    }
  };


  return (
    <div id='loc-container' style={{ zIndex: props.modalZIndex || 100}}>
      <div id='loc-location-text'>{pastLocations[currentId].address}</div>
      <div id='loc-location-change' onClick={() => setModalOpen(true)}>Change Location</div>
    
      <div
        id='loc-modal-container'
        style={{ height, opacity: modalOpen ? 1 : 0 }}
        onMouseDown={closeModal}
      >
        <div
          id='loc-modal-box'
          onMouseDown={(e) => e.stopPropagation()}
        >
          <MapBar
            token={props.token}
            bbox={props.bbox || defaultBBox}
            allowedStates={props.allowedStates}
            mapRef={mapRef}
            handleChangeLocations={handleChangeLocations}
            handleClose={closeModal}
          />

          <Map
            token={props.token}
            allowedStates={props.allowedStates}
            bbox={props.bbox || defaultBBox}
            mapRef={mapRef}
            handleChangeLocations={handleChangeLocations}
            currentLocation={pastLocations[currentId]}
            pastLocations={pastLocations}
          />
        </div>
      </div>
    </div>
  );
}

LocationPicker.propTypes = {
  allowedStates: PropTypes.array,
  bbox: PropTypes.object,
  token: PropTypes.string,
  modalZIndex: PropTypes.number,
  newLocationsCallback: PropTypes.func,
  selected: PropTypes.string,
  locations: PropTypes.object
};