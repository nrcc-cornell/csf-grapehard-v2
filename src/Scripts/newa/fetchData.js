import { parseISO, formatISO, addDays, isSameDay, differenceInDays } from "date-fns";

function extendDailyFcstData(allKeys, hourlyData, dailyData) {
  const keys = allKeys.filter(
    k =>
      k !== 'date' &&
      k !== 'serverDate' &&
      k !== 'flags' &&
      k !== 'ms' &&
      k !== 'isForecast',
  );

  let p = {};
  keys.forEach(k => (p[k] = []));

  let res = [];
  let date = hourlyData[0].date;
  let serverDate = hourlyData[0].serverDate;
  let ms = hourlyData[0].ms;
  let isForecast = hourlyData[0].isForecast;
  hourlyData.slice(1).forEach((h, i) => {
    let hour = h.date.getHours();
    if (hour === 0) hour = 24;
    if (hour === 23) {
      date = h.date;
      serverDate = h.serverDate;
      ms = h.ms;
      isForecast = h.isForecast;
    }
    keys.forEach(k => (p[k] = [...p[k], h[k]]));

    if (i === hourlyData.length - 1) {
      res.push({...p, date, serverDate, ms, isForecast});
    } else {
      if (hour === 24) {
        res.push({...p, date, serverDate, ms, isForecast});
        keys.forEach(k => (p[k] = []));
      }
    }
  });

  const hrDataKeys = Object.keys(hourlyData[0]);
  let results = [...res];

  if (hrDataKeys.includes('temp')) {
    results = res.map(d => {
      d['maxt'] = Math.max(...d['temp'].filter(d => typeof d === 'number'));
      d['mint'] = Math.min(...d['temp'].filter(d => typeof d === 'number'));
      return d;
    });
  }
  if (hrDataKeys.includes('prcp')) {
    results = res.map(d => {
      const filtered = d['prcp'].filter(d => typeof d === 'number');
      const prcp = filtered.reduce((acc, curr) => acc + curr, 0);
      d['prcpCumulative'] = +prcp.toFixed(2);
      return d;
    });
  }

  if (results.length > dailyData.length) {
    return results.map((day, i) => ({...day, dayOfYear: i + 1}));
  } else {
    return dailyData.map((d, i) => ({
      ...d,
      prcpCumulative: d.prcp,
      ...res[i],
      dayOfYear: i + 1,
    }));
  }
}

function beautifyHrData(data, key, isForecast) {
  return data.map(d => {
    const dateObj = new Date(d[0]);
    let p = {ms: dateObj.getTime(), isForecast};
    key.forEach((k, i) => {
      if (k === 'date') {
        p['date'] = dateObj;
        p['serverDate'] = d[0].slice(0, 10);
      } else if (k === 'flags') {
        p['flags'] = d[i];
      } else {
        p[k] = d[i] === 'M' ? 'M' : +d[i];
      }
    });
    return p;
  });
}

function beautifyDailyData(data, key, isForecast) {
  return data.map(d => {
    const yy = Number(d[0].slice(0, 4));
    const mm = Number(d[0].slice(5, 7) - 1);
    const dd = Number(d[0].slice(8, 10));
    const date = new Date(yy, mm, dd, 23, 59, 59, 0);
    let p = {ms: date.getTime(), isForecast};
    key.forEach((k, i) => {
      if (k === 'date') {
        p[k] = date;
        p['serverDate'] = d[0].slice(0, 10);
      } else if (k === 'weather') {
        p[k] = d[i];
      } else {
        p[k] = d[i] === 'M' ? 'M' : +d[i];
      }
    });
    return p;
  });
}

function processLocHrlyData(response) {
  // Extract useful fields
  const {
    hrlyData,
    hrlyFields,
    fcstData,
    fcstFields,
    dlyFcstData,
    dlyFcstFields,
  } = response;

  // Process hrly data into usable form
  const hourlyData = beautifyHrData(hrlyData, hrlyFields, false);

  // Process fcst data in usable form if it exists
  let hourlyFcstData = [];
  let dailyFcstData = [];
  if (fcstData) {
    hourlyFcstData = beautifyHrData(fcstData, fcstFields, true);
    dailyFcstData = beautifyDailyData(dlyFcstData, dlyFcstFields, true);
  }

  // Define keys in final data objects
  let allKeys = [...hrlyFields];
  if (fcstFields) {
    fcstFields.forEach(key => {
      if (!hrlyFields.includes(key)) allKeys.push(key);
    });
  }

  // Concat hrly data and finish processing forecasted daily data, then return
  return {
    hourlyData: hourlyData.concat(hourlyFcstData),
    hrlyFields,
    dailyFcstData: extendDailyFcstData(
      allKeys,
      hourlyFcstData,
      dailyFcstData
    ),
  };
}

function processDailyData(fcstDaily, acisDaily) {
  // Reduce acisDaily to observed only by striping days missing values from the end of the data (modifies original data in place)
  let lastObservedDate = null;
  while (lastObservedDate === null) {
    const lastItem = acisDaily.data.pop();
    if (!lastItem.includes(-999)) {
      lastObservedDate = lastItem[0];
      acisDaily.data.push(lastItem);
    }
  }

  // Format both sets of data for consistency
  const formattedAcisData = acisDaily.data.map(([date, mint, maxt]) => ({ serverDate: date, mint, maxt, isForecast: false }));
  const formattedFcstData = fcstDaily.map(({ serverDate, mint, maxt, isForecast }) => ({ serverDate, mint, maxt, isForecast }));

  let expectedFcstDate = addDays(parseISO(lastObservedDate), 1);
  const firstFcstDate = parseISO(formattedFcstData[0].serverDate);

  const difference = differenceInDays(firstFcstDate, expectedFcstDate);
  // If difference === 0 then it is the expected scenario, observed ends the day prior to the first forecast and we can concat without alterations
  // If difference > 0 the it is an unexpected scenario, there is a gap between the observed and fcst data. This is handled after the models run by inserting filler objects with null values
  if (difference < 0) {
    // Forecast begins before the end of the observed data (overlap). Use observed over the forecast. This would only happen if the forecasts are not being updated in locHrly, so it is unlikely, but handled nonetheless.
    for (let i = 0; i < -difference; i++) {
      formattedFcstData.shift();
    }
  }
  return [...formattedAcisData, ...formattedFcstData];
}

function postFetchJson(url, args) {
  return fetch(url, {
    method: 'POST',
    body: JSON.stringify(args)
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(response.statusText);
      }

      return response.json();
    })
    .catch(err => console.error('Failed query for data ', err));
}

// Fetch data for grid point
export const fetchGridPointData = async (locHrlyBody, acisBody) => {
  // Gather data
  const [locHrlyResults, acisResults] = await Promise.all([
    postFetchJson('https://hrly.nrcc.cornell.edu/locHrly', locHrlyBody),
    postFetchJson('https://grid2.rcc-acis.org/GridData', acisBody)
  ]);

  // If data was successfully gathered, process it
  let hourlyData = null;
  let hrlyFields = null;
  let dailyData = null;
  if (locHrlyResults && acisResults) {
    // Process hourly return into two pieces: the daily fcst data, all of the hrly data (observed & fcst in single array)
    const { dailyFcstData, ...finalHrly } = processLocHrlyData(locHrlyResults);
    hourlyData = finalHrly.hourlyData;
    hrlyFields = finalHrly.hrlyFields;

    // Process daily fcst from above and ACIS return into daily data array (contains observed & fcst)
    dailyData = processDailyData(dailyFcstData, acisResults);
  }

  return { hourlyData, hrlyFields, dailyData };
};