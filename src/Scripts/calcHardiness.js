const calcGDD = (avgTemp, thres) => avgTemp > thres ? avgTemp - thres : 0;
const calcChillDD = (avgTemp, thres) => avgTemp < thres ? avgTemp - thres : 0;

// Takes a number or string to round and a number for digits to round to, returns a rounded number
const roundXDigits = ( number, digits ) => {
  if (typeof number === 'string') number = parseFloat(number);
  const res = (Math.round( Math.round( number * Math.pow(10, digits + 1) ) / 10 ) / Math.pow(10, digits)).toFixed(digits);
  return parseFloat(res);
};

// To add and remove grape varieties, alter this object following the structure shown. The tool will handle adding the radio option for the user selection, so no other changes should be necessary.
const grapeConstants = {
  'Barbera':{
    hardiness: {
      init:-10.1,
      min:-1.2,
      max:-23.5,
    },
    tempThresh:[15.0,3.0],
    dormBoundary:-700,
    acclimRate:[0.06,0.02],
    deacclimRate:[0.10,0.08],
    theta:7
  },
  'Cabernet franc':{
    hardiness: {
      init:-9.9,
      min:-1.2,
      max:-25.4,
    },
    tempThresh:[13.0,4.0],
    dormBoundary:-500,
    acclimRate:[0.12,0.10],
    deacclimRate:[0.04,0.10],
    theta:7
  },
  'Cabernet Sauvignon':{
    hardiness: {
      init:-10.3,
      min:-1.2,
      max:-25.1,
    },
    tempThresh:[13.0,5.0],
    dormBoundary:-700,
    acclimRate:[0.12,0.10],
    deacclimRate:[0.08,0.10],
    theta:7
  },
  'Chardonnay':{
    hardiness: {
      init:-11.8,
      min:-1.2,
      max:-25.7,
    },
    tempThresh:[14.0,3.0],
    dormBoundary:-600,
    acclimRate:[0.10,0.02],
    deacclimRate:[0.10,0.08],
    theta:7
  },
  'Chenin blanc':{
    hardiness: {
      init:-12.1,
      min:-1.2,
      max:-24.1,
    },
    tempThresh:[14.0,4.0],
    dormBoundary:-700,
    acclimRate:[0.10,0.02],
    deacclimRate:[0.04,0.10],
    theta:7
  },
  'Concord':{
    hardiness: {
      init:-12.8,
      min:-2.5,
      max:-29.5,
    },
    tempThresh:[13.0,3.0  ],
    dormBoundary:-600,
    acclimRate:[0.12,0.10],
    deacclimRate:[0.02,0.10],
    theta:3
  },
  'Dolcetto':{
    hardiness: {
      init:-10.1,
      min:-1.2,
      max:-23.2,
    },
    tempThresh:[12.0,4.0],
    dormBoundary:-600,
    acclimRate:[0.16,0.10],
    deacclimRate:[0.10,0.12],
    theta:3
  },
  'Gewurztraminer':{
    hardiness: {
      init:-11.6,
      min:-1.2,
      max:-24.9,
    },
    tempThresh:[13.0,6.0],
    dormBoundary:-400,
    acclimRate:[0.12,0.02],
    deacclimRate:[0.06,0.18],
    theta:5
  },
  'Grenache':{
    hardiness: {
      init:-10.0,
      min:-1.2,
      max:-22.7,
    },
    tempThresh:[12.0,3.0],
    dormBoundary:-500,
    acclimRate:[0.16,0.10],
    deacclimRate:[0.02,0.06],
    theta:5
  },
  'Lemberger':{
    hardiness: {
      init:-13.0,
      min:-1.2,
      max:-25.6,
    },
    tempThresh:[13.0,5.0],
    dormBoundary:-800,
    acclimRate:[0.10,0.10],
    deacclimRate:[0.02,0.18],
    theta:7
  },
  'Malbec':{
    hardiness: {
      init:-11.5,
      min:-1.2,
      max:-25.1,
    },
    tempThresh:[14.0,4.0],
    dormBoundary:-400,
    acclimRate:[0.10,0.08],
    deacclimRate:[0.06,0.08],
    theta:7
  },
  'Merlot':{
    hardiness: {
      init:-10.3,
      min:-1.2,
      max:-25.0,
    },
    tempThresh:[13.0,5.0],
    dormBoundary:-500,
    acclimRate:[0.10,0.02],
    deacclimRate:[0.04,0.10],
    theta:7
  },
  'Mourvedre':{
    hardiness: {
      init:-9.5,
      min:-1.2,
      max:-22.1,
    },
    tempThresh:[13.0,6.0],
    dormBoundary:-600,
    acclimRate:[0.12,0.06],
    deacclimRate:[0.08,0.14],
    theta:5
  },
  'Nebbiolo':{
    hardiness: {
      init:-11.1,
      min:-1.2,
      max:-24.4,
    },
    tempThresh:[11.0,3.0],
    dormBoundary:-700,
    acclimRate:[0.16,0.02],
    deacclimRate:[0.02,0.10],
    theta:3
  },
  'Pinot gris':{
    hardiness: {
      init:-12.0,
      min:-1.2,
      max:-24.1,
    },
    tempThresh:[13.0,6.0],
    dormBoundary:-400,
    acclimRate:[0.12,0.02],
    deacclimRate:[0.02,0.20],
    theta:3
  },
  'Riesling':{
    hardiness: {
      init:-12.6,
      min:-1.2,
      max:-26.1,
    },
    tempThresh:[12.0,5.0],
    dormBoundary:-700,
    acclimRate:[0.14,0.10],
    deacclimRate:[0.02,0.12],
    theta:7
  },
  'Sangiovese':{
    hardiness: {
      init:-10.7,
      min:-1.2,
      max:-21.9,
    },
    tempThresh:[11.0,3.0],
    dormBoundary:-700,
    acclimRate:[0.14,0.02],
    deacclimRate:[0.02,0.06],
    theta:7
  },
  'Sauvignon blanc':{
    hardiness: {
      init:-10.6,
      min:-1.2,
      max:-24.9,
    },
    tempThresh:[14.0,5.0],
    dormBoundary:-300,
    acclimRate:[0.08,0.10],
    deacclimRate:[0.06,0.12],
    theta:7
  },
  'Semillon':{
    hardiness: {
      init:-10.4,
      min:-1.2,
      max:-22.4,
    },
    tempThresh:[13.0,7.0],
    dormBoundary:-300,
    acclimRate:[0.10,0.02],
    deacclimRate:[0.08,0.20],
    theta:5
  },
  'Sunbelt':{
    hardiness: {
      init:-11.8,
      min:-2.5,
      max:-29.1,
    },
    tempThresh:[14.0,3.0],
    dormBoundary:-400,
    acclimRate:[0.10,0.10],
    deacclimRate:[0.06,0.12],
    theta:1.5},
  'Syrah':{
    hardiness: {
      init:-10.3,
      min:-1.2,
      max:-24.2,
    },
    tempThresh:[14.0,4.0],
    dormBoundary:-700,
    acclimRate:[0.08,0.04],
    deacclimRate:[0.06,0.08],
    theta:7
  },
  'Viognier':{
    hardiness: {
      init:-11.2,
      min:-1.2,
      max:-24.0,
    },
    tempThresh:[14.0,5.0],
    dormBoundary:-300,
    acclimRate:[0.10,0.10],
    deacclimRate:[0.08,0.10],
    theta:7
  },
  'Zinfandel':{
    hardiness: {
      init:-10.4,
      min:-1.2,
      max:-24.4,
    },
    tempThresh:[12.0,3.0],
    dormBoundary:-500,
    acclimRate:[0.16,0.10],
    deacclimRate:[0.02,0.06],
    theta:7
  }
};
const grapeVarieties = Object.keys(grapeConstants);

const calcHardiness = (grapeType, avgTemps) => {
  const grape = grapeConstants[grapeType];
  const max = grape.hardiness.max;
  const min = grape.hardiness.min;
  const hardinessRange = min - max;
  let yesterdayHardiness = grape.hardiness.init;
  let period = 0,
    chillingSum = 0,
    dd10Sum = 0,
    deacclim = [],
    acclim = [],
    hardinessModel = [];

  for (let i = 0; i < avgTemps.length; i++) {
    const heat = calcGDD(avgTemps[i], grape.tempThresh[period]);
    const chill = calcChillDD(avgTemps[i], grape.tempThresh[period]);
    const dd10 = calcChillDD(avgTemps[i], 10.0);

    const newChill = heat * grape.deacclimRate[period] * (1 - Math.pow((yesterdayHardiness - max) / hardinessRange, grape.theta));
    deacclim.push(chillingSum === 0 ? 0 : newChill);

    const newHeat = chill * grape.acclimRate[period] * (1 - (min - yesterdayHardiness) / hardinessRange);
    acclim.push(newHeat);

    let newHardiness = yesterdayHardiness + newChill + newHeat;
    if (newHardiness <= max) newHardiness = max;
    if (newHardiness > min) newHardiness = min;
    hardinessModel.push(roundXDigits(newHardiness * (9/5) + 32, 1));
    yesterdayHardiness = newHardiness;

    chillingSum += chill;

    dd10Sum += dd10;
    if (dd10Sum <= grape.dormBoundary) period = 1;
  }
  
  return hardinessModel;
};

export { calcHardiness, grapeVarieties };