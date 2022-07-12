# Climate Smart Farming - Apple Stage/Freeze Damage Probability Tool

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app) and edited to minimize dependencies.

## Dependencies

- @emotion/react: ^11.9.3,
- @emotion/styled: ^11.9.3,
- @mui/material: ^5.8.4,
- cubic-spline: ^3.0.3,
- date-fns: ^2.28.0,
- highcharts: ^10.1.0,
- highcharts-react-official: ^3.1.0,
- mapbox-gl: ^2.8.2,
- react: ^18.2.0,
- react-dom: ^18.2.0,
- react-map-gl: ^7.0.16

## Description
Uses a user provided location and date of interest to interface with NRCC LocHrly API and RCC-ACIS API to retrieve air temperatures. It converts those temperatures into GDDs and uses individual apple phenologies to calculate the dates at which the buds change growing stages.