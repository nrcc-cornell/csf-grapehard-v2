import React, { useState, useEffect } from 'react';

import { Box } from '@mui/material';



export default function Loading() {
  const [toggle, setToggle] = useState(0);
  
  useEffect(() => {
    const intervalID = setTimeout(() =>  {
      setToggle((toggle) => (toggle + 1) % 4);
    }, 300);

    return () => clearInterval(intervalID);
  }, [toggle]);  
  
  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      fontSize: '20px',
      minHeight: 'calc(100vh - 473px)',
      '@media (max-width: 640px)': {
        minHeight: 'calc(100vh - 433px)',
      }
    }}>
      <Box sx={{
        position: 'relative',
        display: 'flex'
      }}>
        <Box>Loading</Box>
        <Box sx={{
          position: 'absolute',
          left: '100%'
        }}>{'.'.repeat(toggle)}</Box>
      </Box>
    </Box>
  );
}