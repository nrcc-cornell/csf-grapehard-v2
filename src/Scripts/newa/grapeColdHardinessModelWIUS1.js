// Parameters for WIUS1 updated 20241125 (Mike North)
const cultivarParameters = {
  Brianna: {
    T_threshold_endo: 9,
    T_threshold_eco: 1,
    acclimation_rate_endo: 0.1,
    acclimation_rate_eco: 0.02,
    deacclimation_rate_endo: 0.1,
    deacclimation_rate_eco: 0.18,
    theta_endo: 1,
    theta_eco: 3,
    Hc_initial: -11,
    Hc_min: -9,
    Hc_max: -29.9,
    Hc_range: 20.9,
    EDB: -600,
  },
  Frontenac: {
    T_threshold_endo: 10,
    T_threshold_eco: 1,
    acclimation_rate_endo: 0.1,
    acclimation_rate_eco: 0.06,
    deacclimation_rate_endo: 0.02,
    deacclimation_rate_eco: 0.18,
    theta_endo: 1,
    theta_eco: 1.5,
    Hc_initial: -10.5,
    Hc_min: -10.5,
    Hc_max: -30.6,
    Hc_range: 20.1,
    EDB: -300,
  },
  "La Crescent": {
    T_threshold_endo: 11,
    T_threshold_eco: -1,
    acclimation_rate_endo: 0.08,
    acclimation_rate_eco: 0.04,
    deacclimation_rate_endo: 0.08,
    deacclimation_rate_eco: 0.08,
    theta_endo: 1,
    theta_eco: 7,
    Hc_initial: -9.6,
    Hc_min: -9.6,
    Hc_max: -30.3,
    Hc_range: 20.7,
    EDB: -600,
  },
  Marquette: {
    T_threshold_endo: 13,
    T_threshold_eco: -1,
    acclimation_rate_endo: 0.06,
    acclimation_rate_eco: 0.06,
    deacclimation_rate_endo: 0.1,
    deacclimation_rate_eco: 0.1,
    theta_endo: 1,
    theta_eco: 5,
    Hc_initial: -11.5,
    Hc_min: -10.2,
    Hc_max: -29.3,
    Hc_range: 19.1,
    EDB: -600,
  },
  "Petite Pearl": {
    T_threshold_endo: 15,
    T_threshold_eco: 0,
    acclimation_rate_endo: 0.04,
    acclimation_rate_eco: 0.06,
    deacclimation_rate_endo: 0.02,
    deacclimation_rate_eco: 0.18,
    theta_endo: 1,
    theta_eco: 1,
    Hc_initial: -11.4,
    Hc_min: -11.4,
    Hc_max: -28.9,
    Hc_range: 17.5,
    EDB: -600,
  },
};

// Functions

// Calculate chill hours, cumulative chill hours, and dormancy status
function calculateChill(hourlyTempC, baseTemp, i, EDB, chillSumArray) {
  let chill = 0;
  let dormancyStatus = 0;
  if (hourlyTempC <= baseTemp) {
    chill = -1;
  }
  let chillSum = chill;
  if (i !== 0) {
    chillSum += chillSumArray[i - 1] ?? 0;
  }
  chillSum = isNaN(chillSum) ? 0 : chillSum;
  if (chillSum > EDB) {
    dormancyStatus = 1;
  }
  return { chill, chillSum, dormancyStatus };
}

// Calculate DD_h (Deacclimation side)
function calculateDDhAndDDc(
  date,
  dormancyStatus,
  dailyTempMeanC,
  T_threshold_endo,
  T_threshold_eco
) {
  let DD_h = 0;
  let DD_c = 0;

  // Check if the serverDate is before the threshold in the current year
  const currentServerDate = new Date(date);

  //Extract month and day from currentServerDate
  const currentMonth = currentServerDate.getMonth();
  const currentDay = currentServerDate.getDate();

  // Check if the date falls between July 1 and September 7
  const isResetPeriod =
    (currentMonth === 6 && currentDay >= 1) || // July 1 or later
    (currentMonth === 7) || // Any day in August
    (currentMonth === 8 && currentDay <= 7); // Up to September 7

    if (isResetPeriod) {
      // If serverDate is between July 1 and September 7, reset DD_h and DD_c
      return { DD_h: 0, DD_c: 0 };
    }


  //if (currentServerDate < thresholdDate) {
    // If serverDate is before the threshold, set DD_h and DD_c to 0
    //return { DD_h: 0, DD_c: 0 };
  //}

  if (dormancyStatus === 0) {
    if (dailyTempMeanC > T_threshold_endo) {
      DD_h = Math.round(dailyTempMeanC - T_threshold_endo, 1);
    } else {
      DD_c = Math.round(dailyTempMeanC - T_threshold_endo, 1);
    }
  } else if (dormancyStatus === 1) {
    if (dailyTempMeanC > T_threshold_eco) {
      DD_h = Math.round(dailyTempMeanC - T_threshold_eco, 1);
    } else {
      DD_c = Math.round(dailyTempMeanC - T_threshold_eco, 1);
    }
  }
  return { DD_h, DD_c };
}

// Calculate deacclimation
function calculateDeacclimation(
  dormancyStatus,
  i,
  DD_h,
  DD_c_prior,
  deacclimation_rate_endo,
  deacclimation_rate_eco,
  Hc_prior,
  Hc_max,
  Hc_range,
  theta_endo,
  theta_eco
) {
  let deacclimation = 0;
  if (i === 0 || DD_c_prior >= -0.75) {
    deacclimation = 0;
  }
  if (i !== 0) {
    if (dormancyStatus === 0) {
      deacclimation =
        DD_h *
        deacclimation_rate_endo *
        (1 - Math.pow((Hc_prior - Hc_max) / Hc_range, theta_endo));
    } else if (dormancyStatus === 1) {
      deacclimation =
        DD_h *
        deacclimation_rate_eco *
        (1 - Math.pow((Hc_prior - Hc_max) / Hc_range, theta_eco));
    }
  }
  return deacclimation;
}

// Calculate acclimation
function calculateAcclimation(
  i,
  dormancyStatus,
  DD_c,
  DD_c_sum_prior,
  acclimation_rate_endo,
  acclimation_rate_eco,
  Hc_min,
  Hc_prior,
  Hc_range
) {
  let acclimation = 0;
  if (i === 0 || DD_c_sum_prior >= -0.75) {
    acclimation = 0;
  }
  if (i !== 0) {
    if (dormancyStatus === 0) {
      acclimation =
        DD_c * acclimation_rate_endo * (1 - (Hc_min - Hc_prior) / Hc_range);
    } else if (dormancyStatus === 1) {
      acclimation =
        DD_c * acclimation_rate_eco * (1 - (Hc_min - Hc_prior) / Hc_range);
    }
  }
  return acclimation;
}

// Calculate Daily Hc
function calculateDailyHc(
  i,
  date,
  deacclimation,
  acclimation,
  Hc_initial,
  Hc_prior,
  Hc_max,
  Hc_min,
  dormancyStatus,
) {
  let delta_Hc = 0;
  let Hc_temporary = 0;
  delta_Hc = deacclimation + acclimation;
  if (i === 0) {
    Hc_temporary = Hc_initial + delta_Hc;
  } else {
    Hc_temporary = delta_Hc + Hc_prior;
  }
  if (Hc_temporary < Hc_max ) {
    Hc_temporary = Hc_max;
  } else if (Hc_temporary > Hc_initial && dormancyStatus === 1) {
    Hc_temporary = Hc_min;
  } 

  // Check if the serverDate is before the threshold in the current year
  const currentServerDate = new Date(date);

  //Extract month and day from currentServerDate
  const currentMonth = currentServerDate.getMonth();
  const currentDay = currentServerDate.getDate();

  // Check if the date falls between July 1 and September 7
  const isResetPeriod =
    (currentMonth === 6 && currentDay >= 1) || // July 1 or later
    (currentMonth === 7) || // Any day in August
    (currentMonth === 8 && currentDay <= 7); // Up to September 7

    if (isResetPeriod) {
      // If serverDate is between July 1 and September 7, reset DD_h and DD_c
      return { delta_Hc: 0, Hc_temporary: Hc_initial };
    }

  if (currentMonth >= 8 && currentDay >= 8 && Hc_temporary > Hc_initial) {
    Hc_temporary = Hc_initial;
  }

  return { delta_Hc, Hc_temporary };
}

// Create a promise to wait for hourly data
export async function calculateWIUS1Model(
  dailyWeatherData,
  combinedHourlyData,
  cultivar
) {
  try {
    // Create a promise to wait for daily data
    const resolvedDailyData = await new Promise((resolve) => {
      if (dailyWeatherData) {
        resolve(dailyWeatherData);
      } else {
        resolve([]);
      }
    });
    // console.log("Daily Data", resolvedDailyData);

    // Create a promise to wait for hourly data
    const resolvedHourlyData = await new Promise((resolve) => {
      if (combinedHourlyData) {
        resolve(combinedHourlyData);
      } else {
        resolve([]);
      }
    });

    // Create a promise to wait for cultivar
    const defaultCultivar = "Brianna";
    /*const resolvedCultivar = await new Promise((resolve) => {
      if (cultivar) {
        resolve(cultivar);
      } else {
        resolve(defaultCultivar);
      }
    });*/

    const cultivarParams = cultivarParameters[cultivar];

    // console.log("Cultivar parameters:", cultivarParams);

    if (!cultivarParameters) {
      throw new Error(`Cultivar '${cultivar}' not found in parameters.`);
    }

    const EDB = cultivarParams.EDB;

    let chillSumArray = [];

    // Add new calculations
    //const updatedHourlyData = resolvedHourlyData.map((data, i) => {
      // Example: Add a new calculation based on existing data
      //const baseTemp = 10; // chill hours base temp
      //const tempC = (data.temp - 32) * (5 / 9); // Replace with your calculation logic
      /*const { chill, chillSum, dormancyStatus } = calculateChill(
        tempC,
        baseTemp,
        i,
        EDB,
        chillSumArray
      );*/
      //chillSumArray[i] = chillSum;
      //return {
      //  ...data, // Spread existing data
      //  tempC, // hourly temp in celsius
      //  chill,
      //  chillSum,
      //  dormancyStatus,
      //};
    //});

    // console.log("Resolved Hourly Data After:", updatedHourlyData);

    // Using Map for grouping and summing chill values by serverDate
    const chillByServerDate = new Map();

    //updatedHourlyData.forEach((entry) => {
      //const { serverDate, chill } = entry;

      // Ensure chill is a valid number

      //if (chillByServerDate.has(serverDate)) {
        // Add to existing sum
        //chillByServerDate.set(
          //serverDate,
          //chillByServerDate.get(serverDate) + chill
        //);
      //} else {
        // Initialize with the first value
        //chillByServerDate.set(serverDate, chill);
      //}
    //});

    // Append daily chill to resolvedDailyData by serverDate
    /* if (resolvedDailyData.length > 0) {
      let cumulativeTotalChill = 0; // Initialize the cumulative total

      resolvedDailyData.forEach((entry) => {
        const { serverDate } = entry;

        // Check if the serverDate exists in the chillByServerDate map
        if (chillByServerDate.has(serverDate)) {
          // Append dailyChill to the resolvedDailyData entry
          entry.dailyChill = chillByServerDate.get(serverDate);
        } else {
          // Optional: Add a fallback value if dailyChill is not found
          entry.dailyChill = 0;
        }

        // Calculate the cumulative total and add it as a field
        cumulativeTotalChill += entry.dailyChill;
        entry.cumulativeDailyChill = cumulativeTotalChill;
      });
    } else {
      console.warn("No daily data found to append chill values.");
    } */

    //console.log("Updated resolvedDataData:", resolvedDailyData);

    if (!cultivarParams) {
      throw new Error(`Cultivar '${cultivar}' not found in parameters.`);
    }

    let WIUS1Calculations = [];
    let dormancyStatus = 0;
    let dailyChill = 0;
    let cumulativeDailyChill = 0;
    let DD_h_sum = 0; // Cumulative heating degree days
    let DD_h_values = [];
    let DD_c_sum = 0; // Cumulative cooling degree days
    let DD_c_sum_values = [];
    let DD_c_values = [];
    let Hc_values = [];

    for (let i = 0; i < resolvedDailyData.length; i++) {
      const date = resolvedDailyData[i].serverDate;
      const tempMinC =
        Math.round((resolvedDailyData[i].mint - 32) * (5 / 9) * 10) / 10;
      const tempMaxC =
        Math.round((resolvedDailyData[i].maxt - 32) * (5 / 9) * 10) / 10;
      const tempMeanC = Math.round(((tempMinC + tempMaxC) / 2) * 10) / 10;
      dailyChill = tempMeanC - 10;
      if (dailyChill > 0) {
        dailyChill = 0;
      }
      cumulativeDailyChill += dailyChill;

      // Determine dormancy status
      if (cumulativeDailyChill < EDB) {
        dormancyStatus = 1;
      }

      // Retrieve cultivar=specific thresholds
      const T_threshold_endo = cultivarParams.T_threshold_endo;
      const T_threshold_eco = cultivarParams.T_threshold_eco;

      // Calculate DD_h and DD_c
      let DD_h = 0; // Daily heating degree days
      let DD_c = 0; // Daily cooling degree days
      ({ DD_h, DD_c } = calculateDDhAndDDc(
        date,
        dormancyStatus,
        tempMeanC,
        T_threshold_endo,
        T_threshold_eco
      ));

      DD_c_values.push(DD_c);
      DD_h_values.push(DD_h);

      let DD_c_prior = 0;
      if (i !== 0) {
        DD_c_prior = DD_c_values[i - 1];
      }

      let DD_h_prior = 0;
      if (i !== 0) {
        DD_h_prior = DD_h_values[i - 1];
      }

      // Update cumulative sums
      DD_h_sum += DD_h;
      DD_c_sum += DD_c;

      DD_c_sum_values.push(DD_c_sum);
      let DD_c_sum_prior = 0;
      if (i !== 0) {
        DD_c_sum_prior = DD_c_sum_values[i - 1];
      }

      const deacclimation_rate_endo = cultivarParams.deacclimation_rate_endo;
      const deacclimation_rate_eco = cultivarParams.deacclimation_rate_eco;
      const acclimation_rate_endo = cultivarParams.acclimation_rate_endo;
      const acclimation_rate_eco = cultivarParams.acclimation_rate_eco;
      const Hc_min = cultivarParams.Hc_min;
      const Hc_max = cultivarParams.Hc_max;
      const Hc_range = cultivarParams.Hc_range;
      const theta_endo = cultivarParams.theta_endo;
      const theta_eco = cultivarParams.theta_eco;

      let Hc_initial = cultivarParams.Hc_initial;

      let Hc_prior = cultivarParams.Hc_initial;
      if (i !== 0) {
        Hc_prior = Hc_values[i - 1];
      }

      const deacclimation = calculateDeacclimation(
        dormancyStatus,
        i,
        DD_h,
        DD_c_prior,
        deacclimation_rate_endo,
        deacclimation_rate_eco,
        Hc_prior,
        Hc_max,
        Hc_range,
        theta_endo,
        theta_eco
      );

      const acclimation = calculateAcclimation(
        i,
        dormancyStatus,
        DD_c,
        DD_c_sum,
        acclimation_rate_endo,
        acclimation_rate_eco,
        Hc_min,
        Hc_prior,
        Hc_range
      );

      let delta_Hc = 0;
      let Hc_temporary = 0;
      ({ delta_Hc, Hc_temporary } = calculateDailyHc(
        i,
        date,
        deacclimation,
        acclimation,
        Hc_initial,
        Hc_prior,
        Hc_max,
        Hc_min,
        dormancyStatus
      ));

      let Hc = cultivarParams.Hc_initial;
      if (i !== 0) {
        Hc = Hc_temporary;
      }

      Hc_values.push(Hc);

      const record = {
        date,
        tempMinC,
        tempMaxC,
        tempMeanC,
        dailyChill,
        cumulativeDailyChill,
        EDB,
        dormancyStatus,
        T_threshold_endo,
        T_threshold_eco,
        DD_h_prior,
        DD_h,
        DD_h_sum,
        DD_c_prior,
        DD_c,
        DD_c_sum,
        DD_c_sum_prior,
        deacclimation_rate_endo,
        deacclimation_rate_eco,
        acclimation_rate_endo,
        acclimation_rate_eco,
        Hc_min,
        Hc_max,
        Hc_range,
        theta_endo,
        theta_eco,
        deacclimation,
        acclimation,
        delta_Hc,
        Hc,
        Hc_prior,
        Hc_temporary,
      };

      WIUS1Calculations.push(record);
    }

    //console.log("WIUS1 Calculations:", WIUS1Calculations);
    //console.log("DD_c values:", DD_c_values);
    //console.log("Hc_values:", Hc_values);

    return {
      WIUS1Calculations,
    };
  } catch (error) {
    // Handle any errors that occurred while waiting for hourly data
    console.error("Error while waiting for hourly data:", error);
    // You can return or handle the error as needed
    throw error;
  }
}
