import { format, isAfter, parseISO, subDays } from 'date-fns';

// Inputs: coords- [number (longitude), number (latitude)]
// Gets forecast data at location and digests it into an object of arrays
function fetchForecast(coords) {
  return fetch('https://hrly.nrcc.cornell.edu/locHrly', {
    method: 'POST',
    body: JSON.stringify({
      'lon': coords[0],
      'lat': coords[1],
      'tzo': -5,
      'sdate': format(subDays(new Date(), 1), 'yyyyMMdd08'),      // Use previous day to avoid API data issues
      'edate': 'now'
    })
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(response.statusText);
      }

      return response.json();
    })
    .then(data => {
      return data.dlyFcstData.reduce((acc, arr) => {
        const maxt = parseFloat(arr[1]);
        const mint = parseFloat(arr[2]);
        acc.avgTemps.push(Math.round((maxt + mint) / 2));
        acc.minTemps.push(Math.round(mint));
        acc.dates.push(arr[0].slice(0,10));
        return acc;
      }, { minTemps: [], avgTemps: [], dates: [] }); 
    })
    .catch(() => null);
}


// Inputs: loc- [number (longitude), number (latitude)], sdate- Date object || string in date format ('yyyy-mm-dd'), edate- Date object || string in date format ('yyyy-mm-dd')
// Gets observed weather data specified in elems at given loc for date range from sdate to edate, return as an object of arrays for each return field
function fetchFromAcis(loc, sdate, edate) {
  if (sdate instanceof Date) sdate = format(sdate, 'yyyy-MM-dd');
  if (edate instanceof Date) edate = format(edate, 'yyyy-MM-dd');

  return fetch('https://grid2.rcc-acis.org/GridData', {
    method: 'POST',
    body: JSON.stringify({ 
      'grid': 'nrcc-model',
      loc: loc.join(','),
      sdate,
      edate,
      elems: [{
        'name': 'mint',
        'interval': [0,0,1]
      },{
        'name': 'avgt',
        'interval': [0,0,1]
      }]
    })
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(response.statusText);
      }

      return response.json();
    })
    .then(data => {
      return data.data.reduce((acc, arr) => {
        acc.dates.push(arr[0]);
        if (arr[1] !== -999 && arr[1] !== 'M') {
          acc.minTemps.push(arr[1]);
          acc.avgTemps.push((arr[2] - 32) * (5 / 9));
        } else {
          acc.minTemps.push(null);
          acc.avgTemps.push(null);
        }
        return acc;
      }, { minTemps: [], avgTemps: [], dates: [] });
    });
}


// Inputs: date- string in format 'yyyy-mm-dd'
// Calculates the start and end dates for the season the given date fall within
function calcSeasonBounds(date) {
  let seasonStart = parseInt(date.split('-')[0]);
  if (!isAfter(parseISO(date), parseISO(`${seasonStart}-08-31`))) seasonStart -= 1;
  return {
    seasonStart: `${seasonStart}-09-01`,
    seasonEnd: `${seasonStart + 1}-08-31`
  };
}


// Inputs: arr- Array, targetLength- number, fillValue- any value valid to place in an Array, append- optional, boolean, defaults to true
// Adds targetLength number of fillValue to beginning or end (determined by optional append bollean) of arr
function fillWith(arr, targetLength, fillValue, append=true) {
  const diff = targetLength - arr.length;
  if (diff <= 0) return arr;

  const newPortion = new Array(diff).fill(fillValue);
  return append ? arr.concat(newPortion) : newPortion.concat(arr);
}


// Inputs: loc- [number (longitude), number (latitude)], dateOfInterest: date string in format 'yyyy-mm-dd', thresholdArr- Array of numbers
// Main function, uses inputs to retrieve and digest data into object of Arrays with mandatory return keys of 'dates', 'minTemps', and 'avgTemps'.
async function getWeatherData(loc, dateOfInterest) {
  // Get season bounding dates and determine we are in the current season (used to determine end date for ACIS API call and later to determine if forecast data is needed)
  const { seasonStart, seasonEnd } = calcSeasonBounds(dateOfInterest);
  const isCurrentSeason = !isAfter(new Date(), parseISO(seasonEnd));
  const dataEndDate = isCurrentSeason ? new Date() : seasonEnd;

  // Gather observed data from ACIS API
  const { minTemps, avgTemps, dates } = await fetchFromAcis(loc, seasonStart, dataEndDate);

  // Get forecast data from NRCC locHrly endpoint.
  const { minTemps: foreMins, avgTemps: foreAvgs, dates: foreDates } = await fetchForecast(loc);

  return {
    dates: dates.concat(foreDates),
    minTemps: minTemps.concat(foreMins),
    avgTemps: avgTemps.concat(foreAvgs)
  };
}


export { getWeatherData, fillWith };