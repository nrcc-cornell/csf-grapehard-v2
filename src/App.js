import React, { useState, useEffect } from 'react';
import { format, parseISO, isWithinInterval } from 'date-fns';

import {
  Box,
  TextField,
  MenuItem,
  FormLabel
} from '@mui/material';

import { getWeatherData } from './Scripts/getWeatherData';
import { calcHardiness, grapeVarieties } from './Scripts/calcHardiness';
import {
  allowedStates,
  bbox,
  name,
  token,
  storeLocations
} from './Components/LocationPicker/LocationVariables';

import LocationPicker from './Components/LocationPicker/LocationPicker';
import Chart from './Components/Chart/Chart';
import Loading from './Components/Loading';

const green = '#0B0';
// const radioSX = {
//   marginLeft: '8px',
//   marginBottom: '3px',
//   padding: '5px',
//   color: green,
//   '&.Mui-checked': {
//     color: green,
//   }
// };





function App() {
  const [grapeType, setGrapeType] = useState(grapeVarieties[0]);
  const [weatherData, setWeatherData] = useState({});
  const [hardinessData, sethardinessData] = useState([]);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [locations, setLocations] = useState(() => {
    const stored = localStorage.getItem(`${name}.locations`);
    return stored ? JSON.parse(stored) : {};
  });
  const [selected, setSelected] = useState(JSON.parse(localStorage.getItem(`${name}.selected`)) || '');


  // Update weather data when selected location changes
  useEffect(() => {
    updateWeatherData(date);
  }, [selected]);

  // Update chart data when weather data or grapeType change
  useEffect(() => {
    if (Object.keys(weatherData).includes('avgTemps')) {
      sethardinessData(calcHardiness(grapeType, weatherData.avgTemps));
    }
  }, [weatherData, grapeType]);
  
  
  // Handles getting the weather data for the chart
  const updateWeatherData = async (doi) => {
    if (selected) {
      setWeatherData({});
      const newData = await getWeatherData([locations[selected].lng, locations[selected].lat], doi);
      setWeatherData(newData);
    }
  };

  // Handles whether to update data on date change or not then sets the new date in state
  const handleDateChange = async (e) => {
    const newDateStr = e.target.value;
    const newDate = parseISO(newDateStr);
    
    if (!isWithinInterval(newDate, {
      start: parseISO(weatherData.dates[0]),
      end: parseISO(weatherData.dates[weatherData.dates.length - 1])
    })) {
      await updateWeatherData(newDateStr);
    }

    setDate(newDateStr);
  };


  return (
    <Box>
      <Box sx={{
        display: 'flex',
        width: 900,
        height: 400,
        border: `2px solid ${green}`,
        margin: '20px auto'
      }}>
        <Box sx={{
          width: 200,
          boxSizing: 'border-box',
          borderRight: `2px solid ${green}`,
          padding: '4px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}>
          <Box>
            <FormLabel color='success' sx={{ fontSize: '12.5px' }}>Location</FormLabel>
            <LocationPicker
              selected={selected}
              locations={locations}
              newLocationsCallback={(s, l) => storeLocations(s, l, name, setSelected, setLocations)}
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
                max: format(new Date(), 'yyyy-MM-dd')
              }
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
              top: '4px'
            }}
          >
            {grapeVarieties.map(name => <MenuItem key={name} value={name}>{name}</MenuItem>)}
          </TextField>
        </Box>
        <Box sx={{
          width: 700
        }}>
          {(Object.keys(weatherData).length === 0 || hardinessData.length === 0) ?
            <Loading />
            :
            <Chart
              grapeType={grapeType}
              hardinessData={hardinessData}
              weatherData={weatherData}
              dateOfInterest={date}
              loc={locations[selected].address}
            />
          }
        </Box>
      </Box>
    </Box>
  );
}

export default App;