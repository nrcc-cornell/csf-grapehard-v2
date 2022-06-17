import Spline from 'cubic-spline';
import { format, isAfter, parseISO } from 'date-fns';


// Inputs: coords- [number (longitude), number (latitude)], gddBase- number (GDD Base degrees)
// Gets forecast data at location and digests it into array of [date string 'yyyy-mm-dd', minTemp for date, gdds of given base for date]
function fetchForecast(coords, gddBase) {
  return fetch('https://hrly.nrcc.cornell.edu/locHrly', {
    method: 'POST',
    body: JSON.stringify({
      'lon': coords[0],
      'lat': coords[1],
      'tzo': -5,
      'sdate': format(new Date(), 'yyyyMMdd08'),
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
      return data.dlyFcstData.map(arr => {
        const maxt = parseFloat(arr[1]);
        const mint = parseFloat(arr[2]);
        const gdds = ((maxt + mint) / 2) - gddBase;
        return [arr[0].slice(0,10), Math.round(mint), Math.max(0, Math.round(gdds))];
      }); 
    })
    .catch(() => null);
}


// Inputs: loc- [number (longitude), number (latitude)], sdate- Date object || string in date format ('yyyy-mm-dd'), edate- Date object || string in date format ('yyyy-mm-dd'), elems- valid elems array as specified https://www.rcc-acis.org/docs_webservices.html
// Gets observed weather data specified in elems at given loc for date range from sdate to edate
function fetchFromAcis(loc, sdate, edate, elems) {
  if (sdate instanceof Date) sdate = format(sdate, 'yyyy-MM-dd');
  if (edate instanceof Date) edate = format(edate, 'yyyy-MM-dd');

  return fetch('https://grid2.rcc-acis.org/GridData', {
    method: 'POST',
    body: JSON.stringify({ 'grid': 'nrcc-model', loc: loc.join(','), sdate, edate, elems })
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(response.statusText);
      }

      return response.json();
    })
    .then(data => data.data);
}


// Inputs: date- string in format 'yyyy-mm-dd'
// Calculates the start and end dates for the season the given date fall within
function calcSeasonBounds(date) {
  let seasonStart = parseInt(date.split('-')[0]);
  if (!isAfter(parseISO(date), parseISO(`${seasonStart}-08-01`))) seasonStart -= 1;

  return {
    seasonStart: `${seasonStart}-08-01`,
    seasonEnd: `${seasonStart + 1}-07-31`
  };
}


// Inputs: t- number representing an hourly temperature observation in degrees F
// Returns the chill units for the given hourly temperature
function calcHourlyChillUnits(t) {
  let chill;
  if (t <= 34.7) {
    chill = 0;
  } else if (t <= 44.78) {
    chill = 0.5;
  } else if (t <= 55.22) {
    chill = 1;
  } else if (t <= 61.52) {
    chill = 0.5;
  } else if (t <= 66.02) {
    chill = 0;
  } else if (t <= 69.08) {
    chill = -0.5;
  } else if (t <= 71.6) {
    chill = -1;
  } else if (t <= 73.76) {
    chill = -1.5;
  } else if (73.76 < t) {
    chill = -2;
  }

  return chill;
}


// Inputs: arr- Array, targetLength- number, fillValue- any value valid to place in an Array, append- optional, boolean, defaults to true
// Adds targetLength number of fillValue to beginning or end (determined by optional append bollean) of arr
function fillWith(arr, targetLength, fillValue, append=true) {
  const diff = targetLength - arr.length;
  if (diff <= 0) return arr;

  const newPortion = new Array(diff).fill(fillValue);
  return append ? arr.concat(newPortion) : newPortion.concat(arr);
}


// Inputs: loc- [number (longitude), number (latitude)], dateOfInterest: date string in format 'yyyy-mm-dd', thresholdArr- Array of numbers, ggdBase- number
// Main function, uses inputs to retrieve and digest data into object of Arrays with mandatory return keys of 'dates' and 'minTemps'. The rest of the keys and values are calculated based on contents of thresholdArr
export default async function getData(loc, dateOfInterest, thresholdArr, gddBase) {
  // Get season bounding dates and determine we are in the current season (used to determine end date for ACIS API call and later to determine if forecast data is needed)
  const { seasonStart, seasonEnd } = calcSeasonBounds(dateOfInterest);
  const isCurrentSeason = !isAfter(new Date(), parseISO(seasonEnd));
  const dataEndDate = isCurrentSeason ? new Date() : seasonEnd;
  
  // Elems array to retrieve daily min and max temps
  const temperatureElems = [{
    'name': 'mint',
    'interval': [0,0,1]
  },{
    'name': 'maxt',
    'interval': [0,0,1]
  }];

  // Gather data from ACIS API
  let temperatures = await fetchFromAcis(loc, seasonStart, dataEndDate, temperatureElems);
  
  // Convert ACIS data into arrays for return and for instantiating Spline
  const minTemps = [], dates = [];
  const xs = Array.from({length: temperatures.length * 2}, (v, i) => 12 * i);
  const ys = temperatures.map(arr => {
    dates.push(arr[0]);
    minTemps.push(arr[1]);
    return [arr[1],arr[2]];
  }).flat();

  // Create Spline from ACIS data
  const spline = new Spline(xs, ys);

  // Sort thresholds in descending order, this allows the break logic to shorten the following loops as much as possible
  thresholdArr = thresholdArr.sort((a,b) => b-a);

  let chillSum = 0;
  for (let i = 0; i < xs[xs.length - 1]; i++) {
    // Use Spline to calculate the hourly temp
    const hourlyTemp = spline.at(i);

    // Use hourly temp to calculate hourly chill units
    const chill = calcHourlyChillUnits(hourlyTemp);

    // Add chill units to sum, but ensure that the sum never goes below 0
    chillSum = Math.max(0, chillSum + chill);

    // Check if chill unit sum has crossed any of the thresholds provided in thresholdArr
    let j = 0;
    for (j; j < thresholdArr.length; j++) {
      const threshold = thresholdArr[j];
      
      // If the current threshold has been crossed we know the following ones are done because we sorted earlier, so skip the rest
      if (threshold instanceof Array) break;
      
      // Store the date that the threshold was crossed
      if (chillSum >= threshold) {
        thresholdArr[j] = [threshold, dates[Math.floor(i / 24)]];
      }
    }

    // End the loop if all of the thresholds have been crossed
    if (j === 0) break;
  }

  // Elem obj for retrieving GDDs from ACIS API
  const gddElems = {
    'name': 'gdd',
    'base': gddBase,
    'interval': [0,0,1],
    'duration': 'std',
    'reduce': 'sum'
  };

  // Get data from ACIS and NRCC. The NRCC call is to get the forecast data. The number of ACIS calls varies based on the number of thresholds provided. For each threshold we get an Array of GDDs with accumlations starting at the date that the threshold was crossed
  const gddsAndForecast = await Promise.all([
    ...thresholdArr.map(arr => fetchFromAcis(loc, arr[1], dataEndDate, [{ ...gddElems, 'season_start': arr[1].split('-').slice(1).map(v => parseInt(v)) }])),
    fetchForecast(loc, gddBase)
  ]);

  // Construct the final results object. Dates and minTemps can be added straight away, but the gdd arrays need to have 0's prepended to fill them to the same size as the dates and minTemps arrays
  const results = { dates, minTemps };
  const targetLength = dates.length;
  let gddTotals = {};
  for (let i = 0; i < gddsAndForecast.length - 1; i++) {
    const key = 'thresh' + thresholdArr[i][0];
    results[key] = fillWith(gddsAndForecast[i].map(arr => arr[1]), targetLength, 0, false);

    // Get the last value of each gdd array to use for calculating accumulations if forecast data is needed
    gddTotals[key] = gddsAndForecast[i].slice(-1)[0][1];
  }
  
  // If forecast data is needed, calculate the gdd acculumations and add them, the dates, and the minTemps to the existing results arrays
  if (isCurrentSeason) {
    gddsAndForecast[gddsAndForecast.length - 1].forEach(dayArr => {
      results.dates.push(dayArr[0]);
      results.minTemps.push(dayArr[1]);
      
      for (const [k,v] of Object.entries(gddTotals)) {
        const newTotal = v + dayArr[2];
        results[k].push(newTotal);
        gddTotals[k] = newTotal;
      }
    });
  }
  
  return results;
}