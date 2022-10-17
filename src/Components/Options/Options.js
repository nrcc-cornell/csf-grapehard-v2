import React from 'react';
import PropTypes from 'prop-types';
import { format } from 'date-fns';
import { Box, Button, TextField, MenuItem, FormLabel } from '@mui/material';

import {
  allowedStates,
  bbox,
  name,
  token,
  storeLocations,
} from '../LocationPicker/LocationVariables';

import LocationPicker from '../LocationPicker/LocationPicker';

const green = 'rgb(0,187,0)';
const mediumGreen = 'rgb(0,157,0)';
const darkGreen = 'rgb(0,107,0)';

export default function Options({
  selected,
  setSelected,
  locations,
  setLocations,
  date,
  handleDateChange,
  grapeType,
  setGrapeType,
  grapeVarieties,
  isZoomed,
  thirtyZoom,
  seasonZoom,
}) {
  // Buttons Style
  const btnSX = (isSelected) => ({
    alignSelf: 'center',
    width: 145,
    height: 37,
    color: 'white',
    backgroundColor: isSelected ? darkGreen : green,
    borderRadius: 37,
    textTransform: 'none',
    '&:hover': {
      backgroundColor: isSelected ? darkGreen : mediumGreen,
      cursor: isSelected ? 'default' : 'pointer',
    },
  });

  return (
    <>
      <Box>
        <FormLabel color='success' sx={{ fontSize: '12.5px' }}>
          Location
        </FormLabel>
        <LocationPicker
          selected={selected}
          locations={locations}
          newLocationsCallback={(s, l) =>
            storeLocations(s, l, name, setSelected, setLocations)
          }
          token={token}
          bbox={bbox}
          allowedStates={allowedStates}
          modalZIndex={1}
        />
      </Box>
      <TextField
        color='success'
        type='date'
        label='Date of Interest'
        value={date}
        onChange={handleDateChange}
        InputProps={{
          inputProps: {
            max: format(new Date(), 'yyyy-MM-dd'),
          },
        }}
        variant='standard'
      />
      <TextField
        select
        value={grapeType}
        onChange={(e) => setGrapeType(e.target.value)}
        label='Grape Type'
        sx={{
          position: 'relative',
          top: '4px',
        }}
      >
        {grapeVarieties.map((name) => (
          <MenuItem key={name} value={name}>
            {name}
          </MenuItem>
        ))}
      </TextField>

      <Button sx={btnSX(isZoomed === 'doi')} onClick={thirtyZoom}>
        30-Day Results
      </Button>

      <Button sx={btnSX(isZoomed === 'season')} onClick={seasonZoom}>
        Season To Date
      </Button>
    </>
  );
}

Options.propTypes = {
  selected: PropTypes.string,
  grapeType: PropTypes.string,
  locations: PropTypes.object,
  date: PropTypes.string,
  setGrapeType: PropTypes.func,
  setLocations: PropTypes.func,
  setSelected: PropTypes.func,
  handleDateChange: PropTypes.func,
  isZoomed: PropTypes.string,
  thirtyZoom: PropTypes.func,
  seasonZoom: PropTypes.func,
  grapeVarieties: PropTypes.object,
};
