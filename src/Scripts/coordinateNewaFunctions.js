import { isAfter, parseISO, formatISO, addDays, differenceInDays } from 'date-fns';

import { fetchGridPointData, models } from './newa';

// Inputs: date- ISO date string ('yyyy-mm-dd')
// Calculates the start and end dates for the season the given date falls within
function calcSeasonBounds(date) {
  let seasonStart = parseInt(date.split('-')[0]);
  if (!isAfter(parseISO(date), parseISO(`${seasonStart}-06-30`))) seasonStart -= 1;
  return {
    seasonStart: `${seasonStart}-07-01`,
    seasonEnd: `${seasonStart + 1}-06-30`
  };
}

// Inputs: lat: number representing latitude, lon: number representing longtitude, dateOfInterest: date string in format 'yyyy-mm-dd'
// Uses inputs to retrieve and digest data
async function getWeatherData(lat, lon, dateOfInterest) {
  // Get season bounding dates and determine we are in the current season
  const { seasonStart, seasonEnd } = calcSeasonBounds(dateOfInterest);

  // Use today because this is used to determine ending dates for data requests
  const isCurrentSeason = !isAfter(new Date(), parseISO(seasonEnd));

  const locHrlyBody = {
    lon,
    lat,
    sdate: seasonStart.split('-').join('') + '00',
    edate: isCurrentSeason ? 'now' : seasonEnd.split('-').join('') + '00',
    tzo: -5
  };

  const acisBody = { 
    'grid': 'nrcc-model',
    loc: `${lon},${lat}`,
    sdate: seasonStart,
    edate: isCurrentSeason ? dateOfInterest : seasonEnd,
    elems: [{
      'name': 'mint'
    },{
      'name': 'maxt'
    }]
  };

  return await fetchGridPointData(locHrlyBody, acisBody);
}



// Inputs: cultivar: object with information on the selected cultivar, weatherData: daily and hourly data used in calculations
// Calculates daily hardiness temperatures for a cultivar using the designated model
async function calcHardiness(cultivar, weatherData) {
  console.log(weatherData);
  let dailyWeatherData = null;
  let hourlyWeatherData = null;
  let forecastDays = 0;
  if (weatherData) {
    dailyWeatherData = weatherData.dailyData;
    hourlyWeatherData = weatherData.hourlyData;
    forecastDays = dailyWeatherData.slice(-15).filter(({ isForecast }) => isForecast).length;
  }

  const modelResults = await models[cultivar.modelHelperFunction](dailyWeatherData, hourlyWeatherData, cultivar.cultivarName);

  // Use forecast days to go back and check if there is a gap between dates...fill if so
  const [lastObservedDate, firstFcstDate] = modelResults.dates.slice(-forecastDays-1, -forecastDays+1);
  const difference = differenceInDays(parseISO(firstFcstDate), parseISO(lastObservedDate));
  if (difference > 0) {
    // There is a gap to fill as discussed in the function "processDailyData" found in "./newa/fetchData.js"
    // { serverDate, mint, maxt, isForecast }
    for (let i = 1; i < difference; i++) {
      modelResults.dates.splice(-forecastDays, 0, formatISO(addDays(parseISO(lastObservedDate), i), { representation: 'date' }));
      modelResults.mints.splice(-forecastDays, 0, null);
      modelResults.hardiness.splice(-forecastDays, 0, null);
    }
  }

  return { ...modelResults, forecastDays };
}

export { getWeatherData, calcHardiness };