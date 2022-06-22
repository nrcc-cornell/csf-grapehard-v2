/* eslint-disable no-unused-vars */
import React, { useState, useRef, useMemo, Fragment, useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PropTypes from 'prop-types';
import { format, subDays, addDays, parseISO } from 'date-fns';

import { Box, Button } from '@mui/material';

import { fillWith } from '../../Scripts/getData';

import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import NoDataToDisplay from 'highcharts/modules/no-data-to-display';
import accessibility from 'highcharts/modules/accessibility';
import exporting from 'highcharts/modules/exporting';
NoDataToDisplay(Highcharts);
accessibility(Highcharts);
exporting(Highcharts);
// Highcharts.Chart.prototype.showResetZoom = function () { return; };




const blue = 'rgb(125,181,236)';
const yellow = 'rgb(235,200,35)';
const orange = 'rgb(245,152,57)';
const red = 'rgb(239,32,32)';

const stageInfo = {
  'damagePercents': [10,50,90],
  'damageColors': [yellow, orange, red],
  'dormant':{
    name: 'Dormant',
    killTemps: [-25,-25,-25]
  },
  'stip':{
    name: 'Silver Tip',
    killTemps: [11,5,0]
  },
  'gtip':{
    name: 'Green Tip',
    killTemps: [19,10,4]
  },
  'ghalf':{
    name: '1/2" Green',
    killTemps: [22,17,11]
  },
  'cluster':{
    name: 'Tight Cluster',
    killTemps: [25,21,18]
  },
  'pink':{
    name: 'Pink Bud',
    killTemps: [27,26,24]
  },
  'bloom':{
    name: 'Bloom',
    killTemps: [28,26,25]
  },
  'petalfall':{
    name: 'Petal Fall',
    killTemps: [29,27.1,26.6]
  }
};

function calcStageAndKill50Temps(gdds, phenology) {
  return gdds.reduce((acc, gdd) => {
    let stage = 'dormant';
    if (gdd > phenology.petalfall) {
      stage = 'petalfall';
    } else if (gdd > phenology.bloom) {
      stage = 'bloom';
    } else if (gdd > phenology.pink) {
      stage = 'pink';
    } else if (gdd > phenology.cluster) {
      stage = 'cluster';
    } else if (gdd > phenology.ghalf) {
      stage = 'ghalf';
    } else if (gdd > phenology.gtip) {
      stage = 'gtip';
    } else if (gdd > phenology.stip) {
      stage = 'stip';
    }

    acc.stages.push(stage);
    acc.kill50Temps.push(stageInfo[stage].killTemps[1]);
    return acc;
  }, { stages: [], kill50Temps: [] });
}



export default function Chart({ appleType, applePhenology, dates, dateOfInterest, forecast, gdds, loc, minTemps }) {
  const chartComponent = useRef(null);
  const [isZoomed, setIsZoomed] = useState('doi');


  useEffect(() => {
    if (chartComponent && chartComponent.current) {
      if (isZoomed === 'doi') {
        thirtyZoom();
      }
    }
  }, [dateOfInterest, chartComponent]);


  const thirtyZoom = () => {
    if (chartComponent && chartComponent.current) {
      const datesArr = chartComponent.current.chart.xAxis[0].categories;
      const iOfDOI = datesArr.findIndex(date => date === dateOfInterest);

      // if iOfDOI is too close to beginning or end of season, adjust where the range starts and ends
      let end = iOfDOI + 15;
      let start = iOfDOI - 14;
      if ((datesArr.length - 1) < end) {
        end = datesArr.length - 1;
        start = Math.max(0, end - 30);
      } else if (start < 0) {
        start = 0;
        end = Math.min(datesArr.length - 1, 29);
      }

      chartComponent.current.chart.xAxis[0].setExtremes(start, end);
    }
  };

  const seasonZoom = () => {
    if (chartComponent && chartComponent.current) {
      chartComponent.current.chart.zoomOut();
    }
  };

  const getOptions = useMemo(() => {
    let { stages, kill50Temps } = calcStageAndKill50Temps(gdds, applePhenology);
    
    const newSeries = [{
      data: minTemps,
      name: 'Daily Minimum Temperature',
      color: blue,
      id: 'daily',
      isForecast: false
    },{
      data: kill50Temps,
      name: '50% Damage Temperature',
      color: orange,
      id: 'damage',
      isForecast: false
    }];
    
    if (forecast.gdds.length > 0) {
      const { stages: foreStages, kill50Temps: foreK50Temps } = calcStageAndKill50Temps(forecast.gdds, applePhenology);
      stages = stages.concat(foreStages);

      newSeries.push({
        data: fillWith(forecast.minTemps, dates.length + forecast.dates.length, null, false),
        name: 'Daily Minimum Temperature',
        color: blue,
        dashStyle: 'ShortDot',
        linkedTo: 'daily',
        isForecast: true
      });

      newSeries.push({
        data: fillWith(foreK50Temps, dates.length + forecast.dates.length, null, false),
        name: '50% Damage Temperature',
        color: orange,
        dashStyle: 'ShortDot',
        linkedTo: 'damage',
        isForecast: true
      });

      const blanks = fillWith([], forecast.dates.length, null);
      newSeries[0].data = newSeries[0].data.concat(blanks);
      newSeries[1].data = newSeries[1].data.concat(blanks);
    }

    
    return {
      credits: { enabled: false },
      chart: {
        zoomType: 'x',
        events: {
          load: function () {
            thirtyZoom();
          }
        },
        resetZoomButton: {
          theme: {
            style: { display: 'none' }
          }
        }
      },
      exporting: {
        buttons: {
          contextButton: {
            menuItems: ['printChart', 'separator', 'downloadPNG', 'downloadJPEG', 'downloadPDF', 'downloadSVG']
          }
        }
      },
      plotOptions: {
        line: {
          marker: {
            symbol: 'circle',
            radius: 3
          }
        }
      },
      title: {
        text: `${appleType} Apple Freeze Damage Potential`
      },
      subtitle: {
        text: `@${loc}`
      },
      series: newSeries,
      xAxis: {
        categories: dates.concat(forecast.dates),
        crosshair: {
          color: 'rgb(220,220,220)',
          width: 0.5
        },
        events: {
          setExtremes: function(e) {
            let type = 'custom';
            if (e.trigger === 'zoom' && e.max === undefined && e.min === undefined) {
              type = 'season';
            } else if (!('trigger' in e)) {
              type = 'doi';
            }

            setIsZoomed(type);
          }
        }
      },
      yAxis: {
        title: {
          text: 'Temperature (°F)'
        },
        softMin: -27,
        softMax: 60,
        startOnTick: false
      },
      tooltip: {
        shared: true,
        outside: true,
        split: false,
        useHTML: true,
        backgroundColor: 'white',
        formatter: function() {
          if (!this || !this.points) return '';
  
          const thisStage = stageInfo[stages[this.points[0].point.x]];
          const temps = thisStage.killTemps.map((p, i) => {
            return (
              <Fragment key={i}>
                <Box style={{ color: stageInfo.damageColors[i] }}>{stageInfo.damagePercents[i]}% Damage Temp:</Box>
                <Box style={{ color: stageInfo.damageColors[i], justifySelf: 'right' }}><span style={{ fontWeight: 'bold' }}>{thisStage.killTemps[i]}</span>°F</Box>
              </Fragment>
            );
          });

          return renderToStaticMarkup(<Box style={{
            padding: '0px 6px',
            height: 'fit-content'
          }}>
            <Box style={{ fontSize: '16px', fontWeight: 'bold', textAlign: 'center' }}>{format(parseISO(this.points[0].key), 'MMM do, yyyy')}</Box>
            <Box style={{ fontSize: '10px', fontWeight: 'bold', textAlign: 'center' }}>{this.points[0].series.userOptions.isForecast ? 'Forecast' : 'Observed'}</Box>
            
            <Box style={{
              height: '1px',
              width: '85%',
              backgroundColor: 'rgb(239,64,53)',
              margin: '2px auto'
            }} />
            
            <Box style={{ fontSize: '12px', fontStyle: 'italic', textAlign: 'center' }}>Stage: {thisStage.name}</Box>

            <Box style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 50%)',
              gridTemplateRows: 'repeat(4, 18px)',
              gridColumnGap: '3px',
              alignItems: 'center'
            }}>
              <Box style={{ color: blue }}>Min Temperature:</Box>
              <Box style={{ color: blue, justifySelf: 'right' }}><span style={{ fontWeight: 'bold' }}>{this.points[0].y}</span>°F</Box>

              {temps}
            </Box>
          </Box>);
        }
      }
    };
  }, [applePhenology, dates, gdds, minTemps]);


  return (
    <Box sx={{
      position: 'relative',
      paddingTop: '60px',
      height: 380,
      width: '100%'
    }}>
      <Button
        sx={{
          position: 'absolute',
          top: 12,
          left: '20%',
          transform: 'translateX(-50%)'
        }}
        onClick={thirtyZoom}
      >
        30-Day Results
      </Button>

      <Button
        sx={{
          position: 'absolute',
          top: 12,
          left: '80%',
          transform: 'translateX(-50%)'
        }}
        onClick={seasonZoom}
      >
        Season To Date
      </Button>


      <HighchartsReact
        ref={chartComponent}
        highcharts={Highcharts}
        options={getOptions}
      />
    </Box>
  );
}

Chart.propTypes = {
  appleType: PropTypes.string,
  applePhenology: PropTypes.object,
  dates: PropTypes.array,
  dateOfInterest: PropTypes.string,
  forecast: PropTypes.object,
  gdds: PropTypes.array,
  loc: PropTypes.string,
  minTemps: PropTypes.array
};