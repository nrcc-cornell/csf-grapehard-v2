import React, { useState, useEffect, useRef } from 'react';
import { format, parseISO, isWithinInterval } from 'date-fns';

import { Box } from '@mui/material';

import { getWeatherData, calcHardiness } from './Scripts/coordinateNewaFunctions';
import { grapeVarieties } from './Scripts/newa';

import { name } from './Components/LocationPicker/LocationVariables';
import Chart from './Components/Chart/Chart';
import Loading from './Components/Loading';
import Options from './Components/Options/Options';
import OptionsPopper from './Components/OptionsPopper/OptionsPopper';

import useWindowWidth from './Hooks/useWindowWidth';

const green = '#0B0';

function App() {
  const [grapeType, setGrapeType] = useState(grapeVarieties.cultivars[0]);
  const [weatherData, setWeatherData] = useState({});
  const [hardinessData, setHardinessData] = useState({});
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [locations, setLocations] = useState(() => {
    const stored = localStorage.getItem(`${name}.locations`);
    return stored ? JSON.parse(stored) : {};
  });
  const [selected, setSelected] = useState(
    JSON.parse(localStorage.getItem(`${name}.selected`)) || ''
  );
  const chartComponent = useRef(null);
  const [isZoomed, setIsZoomed] = useState('doi');
  const windowWidth = useWindowWidth();

  // Update weather data when selected location changes
  useEffect(() => {
    updateWeatherData(date);
  }, [selected]);

  // Update chart data when weather data or grapeType change
  useEffect(() => {
    if (Object.keys(weatherData).includes('dailyData')) {
      (async () => {
        setHardinessData(await calcHardiness(grapeType, weatherData));
      })();
    }
  }, [weatherData, grapeType]);

  // If the date of interest changes, reset to initial chart zoom
  useEffect(() => {
    if (chartComponent && chartComponent.current) {
      if (isZoomed === 'doi') {
        thirtyZoom();
      }
    }
  }, [date, chartComponent]);

  // Handles changing to 30-day zoom around date of interest
  const thirtyZoom = () => {
    if (chartComponent && chartComponent.current) {
      const datesArr = chartComponent.current.chart.xAxis[0].categories;
      const iOfDOI = datesArr.findIndex((d) => d === date);

      // if iOfDOI is too close to beginning or end of season, adjust where the range starts and ends
      let end = iOfDOI + 15;
      let start = iOfDOI - 14;
      if (datesArr.length - 1 < end) {
        end = datesArr.length - 1;
        start = Math.max(0, end - 30);
      } else if (start < 0) {
        start = 0;
        end = Math.min(datesArr.length - 1, 29);
      }

      chartComponent.current.chart.xAxis[0].setExtremes(start, end);
    }
  };

  // Zoom out to show entire season
  const seasonZoom = () => {
    if (chartComponent && chartComponent.current) {
      chartComponent.current.chart.zoomOut();
    }
  };

  // Handles getting the weather data for the chart
  const updateWeatherData = async (doi) => {
    if (selected) {
      setWeatherData({});
      const newData = await getWeatherData(
        locations[selected].lat,
        locations[selected].lng,
        doi
      );
      setWeatherData(newData);
    }
  };

  // Handles whether to update data on date change or not then sets the new date in state
  const handleDateChange = async (e) => {
    const newDateStr = e.target.value;
    const newDate = parseISO(newDateStr);

    if (
      !isWithinInterval(newDate, {
        start: parseISO(weatherData.dailyWeatherData[0].serverDate),
        end: parseISO(weatherData.dailyWeatherData[weatherData.dailyWeatherData.length - 1].serverDate),
      })
    ) {
      await updateWeatherData(newDateStr);
    }

    setDate(newDateStr);
  };

  const renderOptions = () => {
    return (
      <Options
        selected={selected}
        setSelected={setSelected}
        locations={locations}
        setLocations={setLocations}
        date={date}
        handleDateChange={handleDateChange}
        grapeType={grapeType}
        setGrapeType={setGrapeType}
        grapeVarieties={grapeVarieties.cultivars}
        isZoomed={isZoomed}
        thirtyZoom={thirtyZoom}
        seasonZoom={seasonZoom}
      />
    );
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          width: 893,
          height: 400,
          border: `2px solid ${green}`,
          margin: '20px auto 0px',
          '@media (max-width: 907px)': {
            boxSizing: 'border-box',
            width: '100%',
            flexDirection: 'column',
            height: 444,
          },
        }}
      >
        {windowWidth >= 908 ? (
          <Box
            sx={{
              width: 200,
              boxSizing: 'border-box',
              borderRight: `2px solid ${green}`,
              padding: '4px',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {renderOptions()}
          </Box>
        ) : (
          <OptionsPopper>{renderOptions()}</OptionsPopper>
        )}
        <Box
          sx={{
            width: '100%',
            '@media (min-width: 908px)': {
              width: '732px',
            },
          }}
        >
          {Object.keys(weatherData).length === 0 ||
          Object.keys(hardinessData).length === 0 ? (
            <Loading />
          ) : (
            <Chart
              grapeType={grapeType}
              hardinessData={hardinessData}
              dateOfInterest={date}
              loc={locations[selected].address}
              chartComponent={chartComponent}
              setIsZoomed={setIsZoomed}
            />
          )}
        </Box>
      </Box>

      <Box sx={{
        fontSize: 12,
        color: 'rgb(100,100,100)',
        width: 893,
        textAlign: 'center',
        margin: '6px auto 20px'
      }}>
        Based on research at 
        &nbsp;<a href="https://cals.cornell.edu/integrated-pest-management" target="_blank" rel="noopener noreferrer">Cornell Integrated Pest Management</a>&nbsp;
        and
        &nbsp;<a href="https://pasdept.wisc.edu/directory/amaya-atucha/" target="blank">University of Wisconsin - Madison</a>
        , with funding from
        &nbsp;<a href="https://portal.nifa.usda.gov/web/crisprojectpages/1029870-coldsnap-an-online-bud-cold-hardiness-prediction-tool-to-assist-grapevine-management-decisions.html" target="_blank" rel="noopener noreferrer">USDA National Institute of Food and Agriculture Grant #2023-68008-39274</a>
        . Tool developed by
        &nbsp;<a href="https://newa.cornell.edu/" target="_blank" rel="noopener noreferrer">NEWA</a>&nbsp;
        and
        &nbsp;<a href="https://www.nrcc.cornell.edu" target="_blank" rel="noopener noreferrer">NRCC</a>
        .
      </Box>
    </Box>
  );
}

export default App;
