import React, {
  useState,
  useRef,
  useMemo,
  // Fragment,
  useEffect
} from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PropTypes from 'prop-types';
import { format, parseISO } from 'date-fns';

import { Box, Button } from '@mui/material';

import { fillWith } from '../../Scripts/getWeatherData';

import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import NoDataToDisplay from 'highcharts/modules/no-data-to-display';
import accessibility from 'highcharts/modules/accessibility';
import exporting from 'highcharts/modules/exporting';
NoDataToDisplay(Highcharts);
accessibility(Highcharts);
exporting(Highcharts);



// Colors used in chart
const purple = 'rgb(239,37,230)';
// const yellow = 'rgb(235,200,35)';
const orange = 'rgb(245,152,57)';
// const red = 'rgb(239,32,32)';
const green = 'rgb(0,187,0)';
const mediumGreen = 'rgb(0,157,0)';
const darkGreen = 'rgb(0,107,0)';

// Buttons Style
const btnSX = (isSelected) => ({
  position: 'absolute',
  transform: 'translateX(-50%)',
  left: -103,
  width: 145,
  height: 37,
  color: 'white',
  backgroundColor: isSelected ? darkGreen : green,
  borderRadius: 37,
  textTransform: 'none',
  '&:hover': {
    backgroundColor: isSelected ? darkGreen : mediumGreen,
    cursor: isSelected ? 'default' : 'pointer'
  }
});

// Info for each stage of bud development
// const stageInfo = {
//   'damagePercents': [10,50,90],
//   'damageColors': [yellow, orange, red],
//   'dormant':{
//     name: 'Dormant',
//     killTemps: [-25,-25,-25]
//   },
//   'stip':{
//     name: 'Silver Tip',
//     killTemps: [11,5,0]
//   },
//   'gtip':{
//     name: 'Green Tip',
//     killTemps: [19,10,4]
//   },
//   'ghalf':{
//     name: '1/2" Green',
//     killTemps: [22,17,11]
//   },
//   'cluster':{
//     name: 'Tight Cluster',
//     killTemps: [25,21,18]
//   },
//   'pink':{
//     name: 'Pink Bud',
//     killTemps: [27,26,24]
//   },
//   'bloom':{
//     name: 'Bloom',
//     killTemps: [28,26,25]
//   },
//   'petalfall':{
//     name: 'Petal Fall',
//     killTemps: [29,27.1,26.6]
//   }
// };

// Inputs: gdds- Array of numbers, phenology- apple species phenology from getData
// Returns { stages- Array of string representing stage name for each day, kill50Temps- Array of numbers representing the temp at which 50% of buds die }
// function calcStageAndKill50Temps(gdds, phenology) {
//   return gdds.reduce((acc, gdd) => {
//     let stage = 'dormant';
//     if (gdd > phenology.petalfall) {
//       stage = 'petalfall';
//     } else if (gdd > phenology.bloom) {
//       stage = 'bloom';
//     } else if (gdd > phenology.pink) {
//       stage = 'pink';
//     } else if (gdd > phenology.cluster) {
//       stage = 'cluster';
//     } else if (gdd > phenology.ghalf) {
//       stage = 'ghalf';
//     } else if (gdd > phenology.gtip) {
//       stage = 'gtip';
//     } else if (gdd > phenology.stip) {
//       stage = 'stip';
//     }

//     acc.stages.push(stage);
//     acc.kill50Temps.push(stageInfo[stage].killTemps[1]);
//     return acc;
//   }, { stages: [], kill50Temps: [] });
// }



export default function Chart({ grapeType, hardinessData, weatherData, dateOfInterest, loc }) {
  const chartComponent = useRef(null);
  const [isZoomed, setIsZoomed] = useState('doi');

  // If the date of interest changes, reset to initial chart zoom
  useEffect(() => {
    if (chartComponent && chartComponent.current) {
      if (isZoomed === 'doi') {
        thirtyZoom();
      }
    }
  }, [dateOfInterest, chartComponent]);


  // Handles changing to 30-day zoom around date of interest
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

  // Zoom out to show entire season
  const seasonZoom = () => {
    if (chartComponent && chartComponent.current) {
      chartComponent.current.chart.zoomOut();
    }
  };

  // Memoized chart options, prevents unnecessary rerenders
  const getOptions = useMemo(() => {
    return {
      credits: {
        text: 'Powered by NRCC',
        href: 'http://www.nrcc.cornell.edu/'
      },
      chart: {
        height: '396px',
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
        text: `${grapeType} Freeze Damage Potential`
      },
      subtitle: {
        text: `@${loc}`
      },
      series: [{
        data: weatherData.minTemps.slice(0,-5),
        name: 'Daily Minimum Temperature',
        color: purple,
        id: 'daily',
        isForecast: false
      },{
        data: hardinessData.slice(0,-5),
        name: 'Hardiness Temperature',
        color: orange,
        id: 'hardiness',
        isForecast: false
      },{
        data: fillWith(weatherData.minTemps.slice(-5), weatherData.dates.length, null, false),
        name: 'Daily Minimum Temperature',
        color: purple,
        dashStyle: 'ShortDot',
        linkedTo: 'daily',
        isForecast: true
      },{
        data: fillWith(hardinessData.slice(-5), weatherData.dates.length, null, false),
        name: 'Hardiness Temperature',
        color: orange,
        dashStyle: 'ShortDot',
        linkedTo: 'hardiness',
        isForecast: true
      }],
      xAxis: {
        categories: weatherData.dates,
        crosshair: {
          color: 'rgb(220,220,220)',
          width: 0.5
        },
        events: {
          // Handles changing the zoom type in state
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
        startOnTick: false,
        plotBands: [{
          from: -Infinity,
          to: 32,
          color: {
            linearGradient:  { x1: 0, x2: 0, y1: 0, y2: 1 },
            stops: [
              [0, 'rgba(73,246,249,0.1)'],
              [0.5, 'rgba(73,246,249,0.15)'],
              [1, 'rgba(73,246,249,0.3)'],
            ]
          },
        },{
          from: 32,
          to: Infinity,
          color: {
            linearGradient:  { x1: 0, x2: 0, y1: 0, y2: 1 },
            stops: [
              [0, 'rgba(255,0,0,0.1)'],
              [1, 'rgba(73,246,249,0.1)'],
            ]
          },
        }]
      },
      tooltip: {
        shared: true,
        outside: true,
        split: false,
        useHTML: true,
        backgroundColor: 'white',
        formatter: function() {
          if (!this || !this.points) return '';

          console.log(this.points);

          return renderToStaticMarkup(<Box style={{
            padding: '0px 6px',
            height: '70px'
          }}>
            <Box style={{ fontSize: '16px', fontWeight: 'bold', textAlign: 'center' }}>{format(parseISO(this.points[0].key), 'MMM do, yyyy')}</Box>
            <Box style={{ fontSize: '10px', fontWeight: 'bold', textAlign: 'center' }}>{this.points[0].series.userOptions.isForecast ? 'Forecast' : 'Observed'}</Box>
            
            <Box style={{
              height: '1px',
              width: '85%',
              backgroundColor: 'rgb(239,64,53)',
              margin: '2px auto'
            }} />
            
            <Box style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 50%)',
              gridTemplateRows: 'repeat(4, 18px)',
              gridColumnGap: '3px',
              alignItems: 'center'
            }}>
              <Box style={{ color: purple }}>Min Temperature:</Box>
              <Box style={{ color: purple, justifySelf: 'right' }}><span style={{ fontWeight: 'bold' }}>{this.points[0].y}</span>°F</Box>

              <Box style={{ color: orange }}>Hardiness Temp:</Box>
              <Box style={{ color: orange, justifySelf: 'right' }}><span style={{ fontWeight: 'bold' }}>{this.points[1].y}</span>°F</Box>
            </Box>
          </Box>);
        }
      }
    };
  }, [hardinessData, weatherData, grapeType, loc]);


  return (
    <Box sx={{
      position: 'relative',
      height: '100%',
      width: '100%'
    }}>
      <Button
        sx={{
          ...btnSX(isZoomed === 'doi'),
          bottom: 50
        }}
        onClick={thirtyZoom}
      >
        30-Day Results
      </Button>

      <Button
        sx={{
          ...btnSX(isZoomed === 'season'),
          bottom: 10,
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
  grapeType: PropTypes.string,
  hardinessData: PropTypes.array,
  weatherData: PropTypes.object,
  dateOfInterest: PropTypes.string,
  loc: PropTypes.string
};