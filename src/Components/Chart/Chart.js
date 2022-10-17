import React, { useMemo } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PropTypes from 'prop-types';
import { format, parseISO } from 'date-fns';

import { Box } from '@mui/material';

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
const orange = 'rgb(245,152,57)';

export default function Chart({
  grapeType,
  hardinessData,
  weatherData,
  dateOfInterest,
  loc,
  chartComponent,
  setIsZoomed,
}) {
  // Memoized chart options, prevents unnecessary rerenders
  const getOptions = useMemo(() => {
    return {
      credits: {
        text: 'Powered by NRCC',
        href: 'http://www.nrcc.cornell.edu/',
      },
      chart: {
        height: '396px',
        zoomType: 'x',
        events: {
          load: function () {
            const datesArr = this.xAxis[0].categories;
            const iOfDOI = datesArr.findIndex(
              (date) => date === dateOfInterest
            );

            // if iOfDOI is too close to beginning or end of season, adjust where the range starts and ends
            let end = iOfDOI + 15;
            let start = iOfDOI - 14;
            if (datesArr.length - 1 < end) {
              end = datesArr.length - 1;
              start = Math.max(0, end - 30);
            } else if (start < 0) {
              start = 0;
              end = Math.min(datesArr.length - 1, 29);
            }

            this.xAxis[0].setExtremes(start, end);
          },
        },
        resetZoomButton: {
          theme: {
            style: { display: 'none' },
          },
        },
      },
      exporting: {
        buttons: {
          contextButton: {
            menuItems: [
              'printChart',
              'separator',
              'downloadPNG',
              'downloadJPEG',
              'downloadPDF',
              'downloadSVG',
            ],
          },
        },
      },
      plotOptions: {
        line: {
          marker: {
            symbol: 'circle',
            radius: 3,
          },
        },
      },
      title: {
        text: `${grapeType} Freeze Damage Potential`,
      },
      subtitle: {
        text: `@${loc}`,
      },
      series: [
        {
          data: weatherData.minTemps.slice(0, -5),
          name: 'Daily Minimum Temperature',
          color: purple,
          id: 'daily',
          isForecast: false,
        },
        {
          data: hardinessData.slice(0, -5),
          name: 'Hardiness Temperature',
          color: orange,
          id: 'hardiness',
          isForecast: false,
        },
        {
          data: fillWith(
            weatherData.minTemps.slice(-5),
            weatherData.dates.length,
            null,
            false
          ),
          name: 'Daily Minimum Temperature',
          color: purple,
          dashStyle: 'ShortDot',
          linkedTo: 'daily',
          isForecast: true,
        },
        {
          data: fillWith(
            hardinessData.slice(-5),
            weatherData.dates.length,
            null,
            false
          ),
          name: 'Hardiness Temperature',
          color: orange,
          dashStyle: 'ShortDot',
          linkedTo: 'hardiness',
          isForecast: true,
        },
      ],
      xAxis: {
        categories: weatherData.dates,
        crosshair: {
          color: 'rgb(220,220,220)',
          width: 0.5,
        },
        events: {
          // Handles changing the zoom type in state
          setExtremes: function (e) {
            let type = 'custom';
            if (
              e.trigger === 'zoom' &&
              e.max === undefined &&
              e.min === undefined
            ) {
              type = 'season';
            } else if (!('trigger' in e)) {
              type = 'doi';
            }

            setIsZoomed(type);
          },
        },
      },
      yAxis: {
        title: {
          text: 'Temperature (°F)',
        },
        softMin: -27,
        softMax: 60,
        startOnTick: false,
        plotBands: [
          {
            from: -Infinity,
            to: 32,
            color: {
              linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
              stops: [
                [0, 'rgba(73,246,249,0.1)'],
                [0.5, 'rgba(73,246,249,0.15)'],
                [1, 'rgba(73,246,249,0.3)'],
              ],
            },
          },
          {
            from: 32,
            to: Infinity,
            color: {
              linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
              stops: [
                [0, 'rgba(255,0,0,0.1)'],
                [1, 'rgba(73,246,249,0.1)'],
              ],
            },
          },
        ],
      },
      tooltip: {
        shared: true,
        outside: true,
        split: false,
        useHTML: true,
        backgroundColor: 'white',
        formatter: function () {
          if (!this || !this.points) return '';

          console.log(this.points);

          return renderToStaticMarkup(
            <Box
              style={{
                padding: '0px 6px',
                height: '70px',
              }}
            >
              <Box
                style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                }}
              >
                {format(parseISO(this.points[0].key), 'MMM do, yyyy')}
              </Box>
              <Box
                style={{
                  fontSize: '10px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                }}
              >
                {this.points[0].series.userOptions.isForecast
                  ? 'Forecast'
                  : 'Observed'}
              </Box>

              <Box
                style={{
                  height: '1px',
                  width: '85%',
                  backgroundColor: 'rgb(239,64,53)',
                  margin: '2px auto',
                }}
              />

              <Box
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 50%)',
                  gridTemplateRows: 'repeat(4, 18px)',
                  gridColumnGap: '3px',
                  alignItems: 'center',
                }}
              >
                <Box style={{ color: purple }}>Min Temperature:</Box>
                <Box style={{ color: purple, justifySelf: 'right' }}>
                  <span style={{ fontWeight: 'bold' }}>{this.points[0].y}</span>
                  °F
                </Box>

                <Box style={{ color: orange }}>Hardiness Temp:</Box>
                <Box style={{ color: orange, justifySelf: 'right' }}>
                  <span style={{ fontWeight: 'bold' }}>{this.points[1].y}</span>
                  °F
                </Box>
              </Box>
            </Box>
          );
        },
      },
    };
  }, [hardinessData, weatherData, grapeType, loc]);

  return (
    <Box
      sx={{
        position: 'relative',
        height: '100%',
        width: '100%',
      }}
    >
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
  loc: PropTypes.string,
  chartComponent: PropTypes.object,
  setIsZoomed: PropTypes.func,
};
