import axios from 'axios';

function extendDailyData(allKeys, hourlyData, dailyData) {
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

function beautifyData(response) {
  const {
    hrlyData,
    hrlyFields,
    dlyData,
    dlyFields,
    fcstData,
    fcstFields,
    dlyFcstData,
    dlyFcstFields,
  } = response;

  const hourlyData = beautifyHrData(hrlyData, hrlyFields, false);
  let dailyData = [];
  if (dlyData) {
    dailyData = beautifyDailyData(dlyData, dlyFields, false);
  }

  let hourlyFcstData = [];
  let dailyFcstData = [];
  if (fcstData) {
    hourlyFcstData = beautifyHrData(fcstData, fcstFields, true);
    dailyFcstData = beautifyDailyData(dlyFcstData, dlyFcstFields, true);
  }

  let allKeys = [...hrlyFields];
  if (fcstFields) {
    fcstFields.forEach(key => {
      if (!hrlyFields.includes(key)) allKeys.push(key);
    });
  }

  return {
    hourlyData,
    hrlyFields,
    hourlyFcstData,
    dailyData: extendDailyData(
      allKeys,
      [...hourlyData, ...hourlyFcstData],
      [...dailyData, ...dailyFcstData],
    ),
  };
}

// Fetch Hourly data from NEWA Stations ------------------------------------------------
export const fetchStationData = async body => {
  const url = 'https://hrly.nrcc.cornell.edu/stnHrly';
  return axios
    .post(url, body)
    .then(res => {
      if (res.data) {
        return beautifyData(res.data);
      }
    })
    .catch(err => console.error('Failed to query hourly station data ', err));
};

// Fetch Hourly data from Grid Points ------------------------------------------------
export const fetchGridPointData = async body => {
  const url = 'https://hrly.nrcc.cornell.edu/locHrly';
  return axios
    .post(url, body)
    .then(res => {
      if (res.data) {
        return beautifyData(res.data);
      }
    })
    .catch(err => console.error('Failed to query hourly grid point data ', err));
};