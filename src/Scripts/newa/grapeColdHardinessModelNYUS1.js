export async function calculateNYUS1(
  dailyWeatherData,
  combinedHourlyData,
  cultivar
) {
  // Functions for NYUS1
  /*function KovaleskiCalculateDynamicCumulativeHourlyChillPortions(resolvedHourlyData) {
    const kovaleskiDynamicCumulativeHourlyChillPortions = [];

    if (!resolvedHourlyData || !Array.isArray(resolvedHourlyData)) {
      throw new Error("Invalid or missing hourlyWeatherData");
    }

    let InterS = [];
    let InterE = [];
    let cumulativeHourlyPortions = [];

    for (let i = 0; i < resolvedHourlyData.length; i++) {
      let InterS = 0;
      let InterE = 0;
      const timestamp = resolvedHourlyData[i].date;
      const date = resolvedHourlyData[i].serverDate;
      const TempC = (resolvedHourlyData[i].temp - 32) * (5 / 9);
      const e0 = 4.15e3;
      const e1 = 1.29e4;
      const a0 = 1.4e5;
      const a1 = 2.57e18;
      const slp = 1.6;
      const tetmlt = 277;
      const aa = a0 / a1;
      const ee = e1 - e0;
      const TempK = TempC + 273;
      const ftmprt = (slp * tetmlt * (TempK - tetmlt)) / TempK;
      const sr = Math.exp(ftmprt);
      const xi = sr / (1 + sr);
      const xs = aa * Math.exp(ee / TempK);
      const ak1 = a1 * Math.exp(-e1 / TempK);
      if (i === 0) {
        InterS[i] = 0;
        InterE[i] = xs - (xs - InterS[i]) * Math.exp(ak1);
      } else {
        if (InterE[i - 1] < 1) {
          InterS[i] = InterE[i - 1];
          InterE[i] = xs - (xs - InterS[i]) * Math.exp(ak1);
        } else {
          InterS[i] = InterE[i - 1] - InterE[i - 1] * xi;
          InterE[i] = xs - (xs - InterS[i]) * Math.exp(ak1);
        }
      }
      let delt = 0;
      if (InterE[i] < 1) {
        delt = 0;
      } else {
        delt = InterE[i] * xi;
      }
      if (i === 0) {
        cumulativeHourlyPortions[i] = 0;
      } else {
        cumulativeHourlyPortions[i] = cumulativeHourlyPortions[i -1] + delt;
      }
      const record = {
        timestamp,
        date,
        TempC,
        e0,
        e1,
        a0,
        a1,
        slp,
        tetmlt,
        aa,
        ee,
        TempK,
        ftmprt,
        sr,
        xi,
        xs,
        ak1,
        InterS: InterS[i],
        InterE: InterE[i],
        delt,
        cumulativeHourlyPortions: cumulativeHourlyPortions[i],
      };

      kovaleskiDynamicCumulativeHourlyChillPortions.push(record);
    }
    return {
      kovaleskiDynamicCumulativeHourlyChillPortions,
    };
  }*/

  function calculateTempThAcc(T_th_low, T_th_high, b, c, chill) {
    const logChill = Math.log(chill);
    const logC = Math.log(c);
    const denominator = 1 + Math.exp(b * (logChill - logC));
    const T_th_acc = T_th_low + (T_th_high - T_th_low) / denominator;
    return T_th_acc;
  }

  function calculateDeltaTempAcc(T_th_acc, T_air_min) {
    return T_th_acc - T_air_min;
  }

  function calculateChMax(CH_bud_set, CH_abs_max, d, f, delta_T_acc) {
    let logDeltaTAcc = Math.log(delta_T_acc);
    if (isNaN(logDeltaTAcc)) {
      logDeltaTAcc = 0;
    }
    const logF = Math.log(f);
    const denominator = 1 + Math.exp(d * (logDeltaTAcc - logF));
    let CH_max = CH_bud_set + (CH_abs_max - CH_bud_set) / denominator;
    return CH_max;
  }

  function calculateTArtificial(CH_bud_set, CH_max, g, h, CH_star) {
    const numerator = CH_max - CH_bud_set - (CH_star - CH_bud_set);
    const denominator = CH_star - CH_bud_set;
    const lnTerm = Math.log(numerator / denominator);
    let t = h * Math.exp(lnTerm / g);
    if (isNaN(t)) {
      t = 1;
    }
    return t;
  }

  function calculateKAcc(CH_bud_set, CH_max, g, h, t_a) {
    const lnTa = Math.log(t_a);
    const lnH = Math.log(h);
    const expTerm = Math.exp(g * (lnTa - lnH));
    const numerator = expTerm * (-g / t_a);
    const denominator = Math.pow(1 + expTerm, 2);
    const innerTerm = 0.001 + numerator / denominator;
    let k_acc = (CH_max - CH_bud_set) * innerTerm;
    if (isNaN(k_acc)) {
      k_acc = 0;
    }
    return k_acc;
  }

  function calculateKDeacc(T_air, T_max, T_opt, a, k_deacc_max) {
    const ratio = (T_max - T_air) / (T_max - T_opt);
    const exponentTerm = Math.exp(a * (1 - ratio));
    const k_deacc = k_deacc_max * Math.pow(ratio, a) * exponentTerm;
    return k_deacc;
  }

  function calculatePsiDeacc(chill, b, c) {
    const logChill = Math.log(chill);
    const logC = Math.log(c);
    const exponentTerm = Math.exp(-b * (logChill - logC));
    const psiDeacc = 1 / (1 + exponentTerm);
    return psiDeacc;
  }

  /*function calculateKStarDeacc(T_air_min, T_air_max, T_max, T_opt, a, k_deacc_max, chill, b, c) {
    const kDeaccTMin = calculateKDeacc(T_air_min, T_max, T_opt, a, k_deacc_max);
    const kDeaccTMax = calculateKDeacc(T_air_max, T_max, T_opt, a, k_deacc_max);
    const psiDeacc = calculatePsiDeacc(chill, b, c);
    const k_deacc_ti = ((kDeaccTMin + kDeaccTMax) / 2) * psiDeacc;
    return k_deacc_ti;
  }*/

  function calculateDailyCH(
    CH_bud_set,
    integrated_k_acc_ti,
    integrated_k_deacc_ti
  ) {
    let daily_CH = CH_bud_set + integrated_k_acc_ti + integrated_k_deacc_ti;
    if (daily_CH > -6) {
      daily_CH = -6;
    } else if (daily_CH < -31) {
      daily_CH = -31;
    }
    return daily_CH;
  }

  const cultivarParameters = {
    /*Concord: {
      T_th_low: 0,
      T_th_high: 12,
      b: 8,
      c: 66,
      CH_abs_max: -31,
      CH_bud_set: -6,
      d: 3,
      f: 5,
      g: -2.1,
      h: 24,
      T_max: 40,
      T_opt: 25,
      k_deacc_max: 1.9,
      a: 3.5,
    }, */
    Concord: {
      T_th_low: 0, // 'tliml'
      T_th_high: 12, // 'tlimh'
      b: 8, // 'tlimb'
      c: 66, // 'tlime'
      CH_abs_max: 31, // 'm' -> Literature states -31
      CH_bud_set: 6, // 'n' -> Literature states -6
      g: -2.1, // 'b'
      h: 24, // 'c'
      T_max: 40,
      T_opt: 25,
      k_deacc_max: 1.9, // 'kdeacc'
      a: 3.5, // 'a',
      d: 3, // 'slp'
      f: 5, // 'int'
    },

    "Cabernet Sauvignon": {
      T_th_low: 0, // 'tliml'
      T_th_high: 8, // 'tlimh'
      b: 7, // 'tlimb'
      c: 66, // 'tlime'
      CH_abs_max: 23, // 'm' -> Literature states -23
      CH_bud_set: 6, // 'n' -> Literature states -6
      g: -2.2, // 'b'
      h: 22, // 'c'
      T_max: 40,
      T_opt: 25,
      k_deacc_max: 1.8, // 'kdeacc'
      a: 5.0, // 'a',
      d: 6, // 'slp'
      f: 3, // 'int'
    },
    Riesling: {
      T_th_low: 0, // 'tliml'
      T_th_high: 12, // 'tlimh'
      b: 7, // 'tlimb'
      c: 66, // 'tlime'
      CH_abs_max: 26, // 'm' -> Literature states -26
      CH_bud_set: 6, // 'n' -> Literature states -6
      g: -1.9, // 'b'
      h: 24, // 'c'
      T_max: 40,
      T_opt: 25,
      k_deacc_max: 2.2, // 'kdeacc'
      a: 5.0, // 'a'
      d: 3, // 'slp'
      f: 4, // 'int'
    },
  };

  function KovaleskiCalculateKdeacc(
    T_max,
    T_air_max,
    T_air_min,
    T_opt,
    a,
    initialKdeacc
  ) {
    let kdeacc = 0; // Initialize kdeacc to zero

    // Condition 1: When T_air_max > 0 and T_air_min > 0
    if (T_air_max > 0 && T_air_min > 0) {
      const term1 =
        initialKdeacc *
        Math.pow((T_max - T_air_max) / (T_max - T_opt), a) *
        Math.exp(a * (1 - (T_max - T_air_max) / (T_max - T_opt)));

      const term2 =
        initialKdeacc *
        Math.pow((T_max - T_air_min) / (T_max - T_opt), a) *
        Math.exp(a * (1 - (T_max - T_air_min) / (T_max - T_opt)));

      // Average the terms
      kdeacc = (term1 + term2) / 2;

      // Condition 2: When T_air_max > 0 and T_air_min <= 0
    } else if (T_air_max > 0 && T_air_min <= 0) {
      kdeacc =
        (initialKdeacc *
          Math.pow((T_max - T_air_max) / (T_max - T_opt), a) *
          Math.exp(a * (1 - (T_max - T_air_max) / (T_max - T_opt)))) /
        2;
    }

    // Set kdeacc to 0 if it's negative
    if (kdeacc < 0) {
      kdeacc = 0;
    }

    return kdeacc;
  }

  function KovaleskiCalculateDeaccPotential(b, chill, c) {
    // Check for invalid inputs to avoid NaN results in Math.log
    if (chill <= 0 || c <= 0) {
      return 0;
    }
    const result = 1 / (1 + Math.exp(-b * (Math.log(chill) - Math.log(c))));
    return isNaN(result) ? 0 : result;
  }

  function KovaleskiCalculateDeacc(
    Kovaleski_kdeacc,
    Kovaleski_deacc_potential
  ) {
    // Check for NaN values and return 0 if either input is NaN
    if (isNaN(Kovaleski_kdeacc) || isNaN(Kovaleski_deacc_potential)) {
      return 0;
    }

    return Kovaleski_kdeacc * Kovaleski_deacc_potential;
  }

  function KovaleskiCalculateTlim(T_th_low, T_th_high, b, chill, c) {
    return (
      T_th_low +
      (T_th_high - T_th_low) /
      (1 + Math.exp(b * (Math.log(chill) - Math.log(c))))
    );
  }

  function KovaleskiCalculateCHMax(
    T_air_min,
    Kovaleski_5_tlim,
    CH_bud_set,
    CH_abs_max,
    d,
    f,
    Kovaleski_8_CH_minus_1
  ) {
    let CHmax = -CH_bud_set;
    let lev = 1;

    if (T_air_min < Kovaleski_5_tlim) {
      // Calculate CHmax based on logistic function
      CHmax = -(
        CH_bud_set +
        (CH_abs_max - CH_bud_set) /
        (1 +
          Math.exp(
            -d * (Math.log(-T_air_min + Kovaleski_5_tlim) - Math.log(f))
          ))
      );
    }
    if (Kovaleski_8_CH_minus_1 !== undefined) {
      lev = Kovaleski_8_CH_minus_1 / CHmax;
    } else {
      lev = 999999;
    }


    /*function KovaleskiCalculateCHMax(
      i,
      T_air_min,
      Kovaleski_5_tlim,
      CH_bud_set,
      CH_abs_max,
      d,
      f,
      Kovaleski_8_CH
    ) {
      let CHmax = 0;
      let lev = 1;
      if (i === 0) {
        CHmax = -CH_bud_set;
      } else if (i !== 0) {
        if (T_air_min < Kovaleski_5_tlim) {
          CHmax = -(
            CH_bud_set +
            (CH_abs_max - CH_bud_set) /
              (1 +
                Math.exp(
                  -d * (Math.log(-T_air_min + Kovaleski_5_tlim) - Math.log(f))
                ))
          );
          lev = Kovaleski_8_CH[i - 1] / CHmax;

          if (isNaN(lev)) {
            lev = 1;
          } else if (lev > 1) {
            lev = 1;
          }
        } else {
          CHmax = -CH_bud_set;
        }
      }*/
    return { CHmax, lev };
  }

  function KovaloskiFindClosestTime(data, lev) {
    // Find the index j where the absolute difference between lev and Resp is minimized
    const j = data.reduce((closestIndex, current, index) => {
      const currentDiff = Math.abs(lev - current.Resp);
      const closestDiff = Math.abs(lev - data[closestIndex].Resp);
      return currentDiff < closestDiff ? index : closestIndex;
    }, 0);

    // Use j to get the corresponding Time value
    const ti = data[j].Time;

    return { j, ti };
  }

  function KovaleskiCalculateAcc(
    Kovaleski_6_CHmax,
    CH_bud_set,
    g,
    h,
    Kovaleski_6_ti
  ) {
    // Check for valid input values to prevent NaN in log calculation
    if (Kovaleski_6_ti <= 0 || h <= 0) {
      console.warn(
        "Invalid input for log function: Kovaleski_6_ti and h must be positive."
      );
      return 0; // Return a safe default value, e.g., 0
    }

    /*console.log("Kovaleski_6_CHmax", Kovaleski_6_CHmax);
    console.log("CH_bud_set", CH_bud_set);
    console.log("g", g);
    console.log("h", h);
    console.log("Kovaleski_6_ti", Kovaleski_6_ti);*/

    // Calculate the components step-by-step
    const logTerm = Math.log(Kovaleski_6_ti) - Math.log(h);
    // console.log("logTerm:", logTerm); // Debugging log

    const expTerm = Math.exp(g * logTerm);
    // console.log("expTerm:", expTerm); // Debugging log

    const numerator = expTerm * -g * (1 / Kovaleski_6_ti);
    // console.log("numerator:", numerator); // Debugging log

    const denominator = Math.pow(1 + expTerm, 2);
    // console.log("denominator:", denominator); // Debugging log

    if (denominator === 0) {
      console.warn("Denominator is zero, returning safe value for acc.");
      return 0;
    }

    // Final calculation for acc
    let acc = 0;
    if (Kovaleski_6_CHmax < -CH_bud_set) {
      acc = (Kovaleski_6_CHmax + -CH_bud_set) * (0.001 + numerator / denominator);
    } else {
      acc = 0;
    }


    return acc;
  }

  function KovaleskiCalculateCH(
    i,
    Kovaleski_7_Acc,
    Kovaleski_3_Deacc,
    Kovaleski_8_CH
  ) {
    // Ensure Kovaleski_8_CH[i - 1] exists and is a valid number
    const previousCH = Kovaleski_8_CH[i - 1] || Kovaleski_8_CH;

    // Ensure Acc and Deacc are valid numbers
    const Acc = isNaN(Kovaleski_7_Acc) ? 0 : Kovaleski_7_Acc;
    const Deacc = isNaN(Kovaleski_3_Deacc) ? 0 : Kovaleski_3_Deacc;

    if (i === 0) {
      return previousCH;
    } else {
      return previousCH + Acc + Deacc;
    }
  }

  const outputVariables = [];

  // Get hourly data
  try {
    const resolvedDailyData = await new Promise((resolve) => {
      if (dailyWeatherData) {
        resolve(dailyWeatherData);
      } else {
        resolve([]);
      }
    });

    // Create a promise to wait for hourly data
    const resolvedHourlyData = await new Promise((resolve) => {
      if (combinedHourlyData) {
        resolve(combinedHourlyData);
      } else {
        resolve([]);
      }
    });

    // Create a promise to wait for cultivar
    const defaultCultivar = "Concord";
    const resolvedCultivar = await new Promise((resolve) => {
      if (cultivar) {
        resolve(cultivar);
      } else {
        resolve(defaultCultivar);
      }
    });

    // Calculate hourly chill portions
    function calculateHourlyChillPortion(resolvedHourlyData) {
      const hourlyChillPortions = [];

      function roundTo(value, decimals) {
        return Number(Math.round(value + "e" + decimals) + "e-" + decimals);
      }

      if (!resolvedHourlyData || !Array.isArray(resolvedHourlyData)) {
        throw new Error("Invalid or missing hourlyWeatherData");
      }

      for (let i = 0; i < resolvedHourlyData.length; i++) {
        const timestamp = resolvedHourlyData[i].date;
        const date = resolvedHourlyData[i].serverDate;
        const hourlyTempC = roundTo(
          (resolvedHourlyData[i].temp - 32) * (5 / 9),
          1
        );
        const e0 = 4153.5;
        const e1 = 12888.8;
        const a0 = 139500;
        const a1 = 2.57e18;
        const slp = 1.6;
        const tetmlt = 277;
        const aa = 5.43e-14;
        const ee = 8735.3;
        const TK = 273 + hourlyTempC;
        const ftmprt = (slp * tetmlt * (TK - tetmlt)) / TK;
        const sr = Math.exp(ftmprt);
        const xi = sr / (1 + sr);
        const xs = aa * Math.exp(ee / TK);
        const ak1 = a1 * Math.exp(-e1 / TK);
        let S = 0;
        let E = 0;
        if (i === 0) {
          S = 0; // Initialize S to 0 for the first iteration if required
          E = roundTo(xs - (xs - S) * Math.exp(-ak1), 4);
        } else {
          // Check if previous E is less than 1 to match Excel logic
          const prevE = hourlyChillPortions[i - 1].E; // Corresponds to K45 in Excel
          const prevXi = hourlyChillPortions[i - 1].xi; // Corresponds to G45 in Excel

          S = roundTo(prevE < 1 ? prevE : prevE - prevE * prevXi, 4);
          E = roundTo(xs - (xs - S) * Math.exp(-ak1), 4);
        }
        const interE = E;
        let delt = 0;
        if (interE < 1) {
          delt = 0;
        } else {
          delt = interE * xi;
        }

        const record = {
          timestamp,
          date,
          hourlyTempC,
          e0,
          e1,
          a0,
          a1,
          slp,
          tetmlt,
          aa,
          ee,
          TK,
          ftmprt,
          sr,
          xi,
          xs,
          ak1,
          S,
          E,
          delt,
        };

        hourlyChillPortions.push(record);
      }

      return {
        hourlyChillPortions,
      };
    }

    function calculateNYUS1Model(
      dailyWeatherData,
      combinedHourlyData,
      cultivar
    ) {
      if (!dailyWeatherData || !combinedHourlyData || !cultivar) {
        throw new Error("Missing required input data.");
      }
      const cultivarParams = cultivarParameters[cultivar];

      if (!cultivarParams) {
        throw new Error(`Cultivar '${cultivar}' not found in parameters.`);
      }

      const {
        T_th_low,
        T_th_high,
        b,
        c,
        CH_abs_max,
        CH_bud_set,
        d,
        f,
        g,
        h,
        T_max,
        T_opt,
        k_deacc_max,
        a,
      } = cultivarParams;

      // Import hourly chill portions and summarize daily accumulation.

      //console.log("Combined Hourly Data:", combinedHourlyData);

      const hourlyChillPortions =
        calculateHourlyChillPortion(combinedHourlyData);
      //console.log("Dan's Hourly Chill Portions:", hourlyChillPortions);

      const hourlyChillPortionsArray = Object.keys(hourlyChillPortions).map(
        (date) => ({
          date,
          delt: hourlyChillPortions[date],
        })
      );

      // Calculate Daily chill sums
      let dailyChillSums = {};

      if (Array.isArray(hourlyChillPortionsArray)) {
        hourlyChillPortionsArray.forEach((hourlyData) => {
          if (Array.isArray(hourlyData.delt)) {
            hourlyData.delt.forEach((nestedData) => {
              const { date, delt } = nestedData;
              // Now you can use date and delt
              dailyChillSums[date] = (dailyChillSums[date] || 0) + delt;
            });
          } else {
            console.error("hourlyData.delt is not an array");
          }
        });
      } else {
        console.error("hourlyChillPortionsArray is not an array");
      }

      // Model calculations
      let NYUS1calculations = [];

      let chill = 0;
      let Kovaleski_3a_Sumdeacc = 0;
      let Kovaleski_8_CH = -CH_bud_set;
      for (let i = 0; i < dailyWeatherData.length; i++) {
        const date = dailyWeatherData[i].serverDate;
        const T_air_min = (dailyWeatherData[i].mint - 32) * (5 / 9);
        const T_air_max = (dailyWeatherData[i].maxt - 32) * (5 / 9);
        if (dailyChillSums.hasOwnProperty(date)) {
          chill = chill + dailyChillSums[date];
        }
        const T_th_acc = calculateTempThAcc(T_th_low, T_th_high, b, c, chill);
        const delta_T_acc = calculateDeltaTempAcc(T_th_acc, T_air_min);
        const CH_max = calculateChMax(
          CH_bud_set,
          CH_abs_max,
          d,
          f,
          delta_T_acc
        );
        let CH_star = 0;
        if (i === 0) {
          CH_star = -6;
        } else {
          CH_star = NYUS1calculations[i - 1].daily_CH;
        }
        /*const t_a = calculateTArtificial(CH_bud_set, CH_max, g, h, CH_star);
        const k_acc = calculateKAcc(CH_bud_set, CH_max, g, h, t_a);*/
        const Kovaleski_1_kdeacc = KovaleskiCalculateKdeacc(
          T_max,
          T_air_max,
          T_air_min,
          T_opt,
          a,
          k_deacc_max
        );
        const Kovaleski_2_deacc_potential = KovaleskiCalculateDeaccPotential(
          b,
          chill,
          c
        );
        const Kovaleski_3_Deacc = KovaleskiCalculateDeacc(
          Kovaleski_1_kdeacc,
          Kovaleski_2_deacc_potential
        );
        Kovaleski_3a_Sumdeacc = Kovaleski_3a_Sumdeacc + Kovaleski_3_Deacc;

        const Kovaleski_5_tlim = KovaleskiCalculateTlim(
          T_th_low,
          T_th_high,
          b,
          chill,
          c
        );
        const { CHmax: Kovaleski_6_CHmax, lev: Kovaleski_6_lev } =
          KovaleskiCalculateCHMax(
            T_air_min,
            Kovaleski_5_tlim,
            CH_bud_set,
            CH_abs_max,
            d,
            f,
            i > 0 ? NYUS1calculations[i - 1].Kovaleski_8_CH : 0 // Fallback to 0 if i is 0
          );

        // Generate Time array
        const time = Array.from({ length: 5000 }, (_, i) => 0.1 + i * 0.1);

        // Calculate Resp for each Time
        const Kovaleski_6_Resp = time.map((t) => {
          const resp = 1 / (1 + Math.exp(g * (Math.log(t) - Math.log(h))));
          return { Time: t, Resp: resp };
        });
        const { j, ti: Kovaleski_6_ti } =
          KovaloskiFindClosestTime(Kovaleski_6_Resp, Kovaleski_6_lev);
        const Kovaleski_6_j = j-1; // Adjust j to R indexing
        let Kovaleski_7_Acc = 0;
        if (i !== 0) {
          Kovaleski_7_Acc = KovaleskiCalculateAcc(
            Kovaleski_6_CHmax,
            CH_bud_set,
            g,
            h,
            Kovaleski_6_ti
          );
        }
        Kovaleski_8_CH = KovaleskiCalculateCH(
          i,
          Kovaleski_7_Acc,
          Kovaleski_3_Deacc,
          Kovaleski_8_CH
        );

        // Adjust Kovaleski_8_CH if its final value is >= -1.9
        if (Kovaleski_8_CH >= -1.9) {
          Kovaleski_8_CH = -1.9;
        }

        const record = {
          date,
          T_air_min,
          T_air_max,
          chill,
          /*T_th_acc,
          delta_T_acc,
          CH_max,
          t_a,
          k_acc,*/
          Kovaleski_1_kdeacc,
          Kovaleski_2_deacc_potential,
          Kovaleski_3_Deacc,
          Kovaleski_3a_Sumdeacc,
          Kovaleski_5_tlim,
          Kovaleski_6_CHmax,
          Kovaleski_6_lev,
          Kovaleski_6_Resp,
          Kovaleski_6_j,
          Kovaleski_6_ti,
          Kovaleski_7_Acc,
          Kovaleski_8_CH,
          /*k_deacc_low,
          k_deacc_high,
          psi_deacc,
          k_deacc_ti,
          daily_CH,
          CH_star,
          integrated_k_acc_ti,
          integrated_k_deacc_ti,*/
        };

        NYUS1calculations.push(record);
      }

      return {
        NYUS1calculations,
      };
    }

    outputVariables.push(
      calculateNYUS1Model(
        resolvedDailyData,
        resolvedHourlyData,
        resolvedCultivar
      )
    );

    return outputVariables;
  } catch (error) {
    // Handle any errors that occurred while waiting for hourly data
    console.error("Error while waiting for hourly data:", error);
    // You can return or handle the error as needed
    throw error;
  }
}
