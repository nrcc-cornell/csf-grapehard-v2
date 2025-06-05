import { fetchGridPointData } from './fetchData';
import { calculateNYUS1 } from './grapeColdHardinessModelNYUS1';
import { calculateWIUS1Model } from './grapeColdHardinessModelWIUS1';
import grapeVarieties from './grapeColdHardinessMetadata.json';

// Takes a temperature in °F, returns a temperature in °C rounded to one decimal place
function cToF(tempC) {
  return Math.round(((tempC * (9/5)) + 32) * 10) / 10;
}

const models = {
  grapeColdHardinessNYUS1: async (dailyWeatherData, combinedHourlyData, cultivar) => {
    const modelResults = await calculateNYUS1(dailyWeatherData, combinedHourlyData, cultivar);
    return modelResults[0].NYUS1calculations.reduce((finalObj, { T_air_min, date, Kovaleski_8_CH }) => {
      finalObj.dates.push(date);
      finalObj.mints.push(cToF(T_air_min));
      finalObj.hardiness.push(cToF(Kovaleski_8_CH));
      return finalObj;
    }, { dates: [], mints: [], hardiness: [] });
  },
  grapeColdHardinessWIUS1: async (dailyWeatherData, combinedHourlyData, cultivar) => {
    const modelResults = await calculateWIUS1Model(dailyWeatherData, combinedHourlyData, cultivar);
    return modelResults.WIUS1Calculations.reduce((finalObj, { tempMinC, date, Hc }) => {
      finalObj.dates.push(date);
      finalObj.mints.push(cToF(tempMinC));
      finalObj.hardiness.push(cToF(Hc));
      return finalObj;
    }, { dates: [], mints: [], hardiness: [] });
  }
};

export {
  fetchGridPointData,
  models,
  grapeVarieties
};