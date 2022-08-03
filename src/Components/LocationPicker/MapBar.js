import React, { useState } from 'react';
import PropTypes from 'prop-types';



export default function MapBar( props ) {
  const [address, setAddress] = useState('');

  // Handles getting location from mapbox geocoding API based on user input
  const handleSearch = () => {
    fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${address.split(' ').join('%20')}.json?proximity=-75.37,43.21&country=US&types=postcode,place,address&access_token=${props.token}`, { method: 'GET' })
      .then(response => response.json())
      .then(jData => {
        const newLocation = jData.features.reduce((acc, feat) => {
          const region = feat.context.find((c) => c.id.includes('region') && (!props.allowedStates || props.allowedStates.includes(c.text)));
          
          if (!acc && region && feat.center[0] >= props.bbox.west && feat.center[1] >= props.bbox.south) {
            const type = feat.place_type[0];
            
            let address;
            if (type === 'postcode') {
              address = feat.place_name.split(',').slice(0,2).join(',');
            } else if (type === 'place') {
              address = `${feat.text}, ${region.text}`;
            } else if (type === 'address') {
              const city = feat.context.find((c) => c.id.includes('place'));
              address = `${feat.text}, ${city.text}, ${region.text}`;
            }
  
            return {
              address,
              lng: feat.center[0],
              lat: feat.center[1]
            };
          }

          return acc;
        }, false);

        if (newLocation) {
          setAddress(newLocation.address);
          props.handleChangeLocations('add', newLocation);
          props.mapRef.current.flyTo({
            center: [newLocation.lng, newLocation.lat],
            speed: 0.8,
            essential: true
          });
        }
      })
      .catch(e => {
        console.log(e);
        return false;
      });
  };


  return (
    <div id='loc-map-bar'>
      <input
        id='loc-map-address-search'
        type='text'
        onChange={(e) => setAddress(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' ? handleSearch() : ''}
        value={address}
      />
      <label id='loc-map-bar-label'>Address Search</label>

      <button
        id='loc-map-bar-btn'
        onClick={handleSearch}
      >Search</button>

      <div id='loc-modal-close' onClick={props.handleClose}><div id='loc-modal-close-x'>X</div></div>
    </div>
  );
}

MapBar.propTypes = {
  token: PropTypes.string,
  allowedStates: PropTypes.array,
  bbox: PropTypes.object,
  mapRef: PropTypes.object,
  handleChangeLocations: PropTypes.func,
  handleClose: PropTypes.func
};