import React, { useRef } from 'react';
import PropTypes from 'prop-types';

import { Box } from '@mui/material';


import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import NoDataToDisplay from 'highcharts/modules/no-data-to-display';
NoDataToDisplay(Highcharts);





export default function Chart({ data }) {
  const chartComponent = useRef(null);
  
  return (
    <Box sx={{
      position: 'relative',
      paddingTop: '60px',
      height: 380,
      width: '100%'
    }}>
      <HighchartsReact
        ref={chartComponent}
        highcharts={Highcharts}
        options={{
          credits: { enabled: false },
          chart: {
            zoomType: 'x'
          },
          plotOptions: {
            line: {
              marker: {
                symbol: 'circle',
                radius: 3
              }
            }
          },
          series: [{
            data: data[0],
            name: 'Hourly Temp Spline'
          },{
            data: data[1],
            name: 'Daily Min Temp'
          }]
        }}
      />
    </Box>
  );
}

Chart.propTypes = {
  data: PropTypes.array
};